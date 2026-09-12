"""
ANALYSIS PIPELINE — Orchestrator
==================================
Parts 1–9 in sequence, driven by metadata (no factory-specific hardcoding).

Pipeline:
  Fetch factory metadata
  → Fetch metrics
  → Fetch measurements
  → Calculate emissions            (EmissionCalculator)
  → Source contribution analysis   (ContributionAnalyzer)
  → Feature engineering            (FeatureEngineer)
  → ML attribution                 (MLAttributionEngine)
  → Root-cause interpretation      (pattern detection)
  → Find applicable alternatives   (AlternativesKnowledgeBase)
  → Calculate impacts              (ImpactCalculator)
  → Rank alternatives              (RecommendationEngine)
  → Return explainable report

The SAME pipeline runs for ANY factory regardless of industry type.
Factory-specific behaviour comes from metric_definitions and alternatives_kb filters.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from psycopg2.extras import RealDictCursor

from analysis.emission_calculator import EmissionCalculator, DEMO_EMISSION_FACTORS
from analysis.contribution_analyzer import ContributionAnalyzer
from analysis.feature_engineer import FeatureEngineer
from analysis.ml_attribution import MLAttributionEngine
from analysis.alternatives_kb import AlternativesKnowledgeBase
from analysis.impact_calculator import ImpactCalculator
from analysis.recommendation_engine import RecommendationEngine

logger = logging.getLogger("AnalysisPipeline")


class AnalysisPipeline:
    """
    Metadata-driven analysis pipeline.
    Accepts factory_id + period → produces full recommendation report.
    """

    def __init__(self, conn):
        self.conn = conn
        self.emission_calc = EmissionCalculator(conn)
        self.contribution = ContributionAnalyzer(conn)
        self.feature_eng = FeatureEngineer(conn)
        self.ml_engine = MLAttributionEngine(conn)
        self.alt_kb = AlternativesKnowledgeBase(conn)
        self.impact_calc = ImpactCalculator(conn)
        self.rec_engine = RecommendationEngine(conn)

    def _get_factory_meta(self, factory_id: str) -> Dict[str, Any]:
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT f.*, o.slug as org_slug, o.id as org_id
                FROM factories f
                JOIN organizations o ON o.id = f.organization_id
                WHERE f.id = %s OR f.code = %s;
                """,
                (factory_id, factory_id)
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Factory '{factory_id}' not found")
            return dict(row)

    def _get_metric_names(self, factory_id: str) -> List[str]:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM metric_definitions WHERE factory_id=%s AND is_active=TRUE;",
                (factory_id,)
            )
            return [r[0] for r in cur.fetchall()]

    def _root_cause_interpretation(
        self,
        feature_matrix: List[Dict[str, Any]],
        attribution: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Part 5 — Compare derived features across the period to find patterns.
        Uses language 'associated with' — does NOT claim causation.
        """
        if len(feature_matrix) < 2:
            return {"patterns": [], "note": "Insufficient data for trend detection"}

        patterns = []

        for feature_key in ["feat_coal_per_ton", "feat_emission_intensity_co2",
                             "Furnace Efficiency", "Coal Consumption"]:
            vals = [row.get(feature_key) for row in feature_matrix if row.get(feature_key) is not None]
            if len(vals) < 2:
                continue

            first_val = vals[0]
            last_val = vals[-1]
            pct_change = ((last_val - first_val) / first_val * 100) if first_val != 0 else 0

            if abs(pct_change) > 2.0:
                direction = "increased" if pct_change > 0 else "decreased"
                interpretation = ""

                if feature_key == "feat_coal_per_ton":
                    if pct_change > 0:
                        interpretation = (
                            "Coal consumption per tonne of steel increased "
                            f"from {first_val:.2f} to {last_val:.2f} kg/tonne ({pct_change:+.1f}%). "
                            "This is associated with declining furnace efficiency or increased coke rates."
                        )
                    else:
                        interpretation = (
                            f"Coal intensity improved from {first_val:.2f} to {last_val:.2f} kg/tonne ({pct_change:+.1f}%)."
                        )

                elif feature_key == "feat_emission_intensity_co2":
                    if pct_change > 0:
                        interpretation = (
                            f"Emission intensity increased from {first_val:.2f} to {last_val:.2f} kg CO2/tonne ({pct_change:+.1f}%). "
                            "This indicates a potential contributing factor to rising emissions per unit of production."
                        )
                    else:
                        interpretation = f"Emission intensity improved {pct_change:+.1f}% — operations are more carbon-efficient."

                elif feature_key == "Furnace Efficiency":
                    if pct_change < 0:
                        interpretation = (
                            f"Furnace efficiency decreased from {first_val:.1f}% to {last_val:.1f}% ({pct_change:+.1f}%). "
                            "Lower efficiency is associated with higher specific coal consumption and emissions. "
                            "Note: correlation observed — does NOT imply direct causation without further investigation."
                        )
                    else:
                        interpretation = f"Furnace efficiency improved {pct_change:+.1f}% — positive operational trend."

                elif feature_key == "Coal Consumption":
                    interpretation = (
                        f"Coal consumption {direction} from {first_val:.0f} to {last_val:.0f} kg/day ({pct_change:+.1f}%). "
                        "As the primary emission source, this change is directly associated with total CO2 output."
                    )

                if interpretation:
                    patterns.append({
                        "feature": feature_key,
                        "first_value": round(first_val, 4),
                        "last_value": round(last_val, 4),
                        "pct_change": round(pct_change, 2),
                        "direction": direction,
                        "interpretation": interpretation
                    })

        primary_driver = attribution.get("primary_driver", {})
        return {
            "patterns": patterns,
            "primary_ml_driver": {
                "feature": primary_driver.get("feature"),
                "shap_importance_pct": primary_driver.get("shap_importance_pct"),
                "interpretation": primary_driver.get("interpretation"),
                "note": attribution.get("important_distinction")
            },
            "data_note": attribution.get("data_size_warning", "")
        }

    def run(
        self,
        factory_id: str,
        period_start: datetime,
        period_end: datetime,
        emission_type: str = "CO2",
        mcda_weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Execute the complete 10-stage analysis pipeline.

        Parameters:
          factory_id      — UUID or code of the factory
          period_start    — Analysis start (UTC datetime)
          period_end      — Analysis end (UTC datetime)
          emission_type   — "CO2", "CH4", etc.
          mcda_weights    — Optional dict to override default MCDA weights

        Returns:
          Full report dict covering all pipeline stages.
        """
        report: Dict[str, Any] = {
            "pipeline_stages": [],
            "warnings": [],
        }

        # ── Stage 1: Fetch Factory Metadata ─────────────────────────────
        logger.info("Stage 1: Fetching factory metadata")
        factory = self._get_factory_meta(factory_id)
        factory_id = str(factory["id"])  # normalize to UUID
        org_id = str(factory["org_id"])
        industry_type = factory["industry_type"]
        available_metrics = self._get_metric_names(factory_id)

        report["factory"] = {
            "id": factory_id,
            "name": factory["name"],
            "code": factory["code"],
            "industry_type": industry_type,
            "location": factory["location"],
        }
        report["analysis_period"] = {
            "start": period_start.isoformat(),
            "end": period_end.isoformat(),
            "emission_type": emission_type,
        }
        report["available_metrics"] = available_metrics
        report["pipeline_stages"].append("Stage 1: Factory metadata loaded")

        # ── Stage 2: Bootstrap emission sources & factors ────────────────
        logger.info("Stage 2: Bootstrapping emission sources and factors")
        bootstrap_meta = self.emission_calc.bootstrap_demo_sources_and_factors(
            factory_id, org_id, emission_type
        )
        report["emission_factors"] = {
            name: {
                "factor_value": cfg["factor_value"],
                "factor_unit": cfg["factor_unit"],
                "methodology": cfg["methodology"],
                "disclaimer": "DEMONSTRATION ASSUMPTION — not site-validated"
            }
            for name, cfg in DEMO_EMISSION_FACTORS.items()
        }
        report["pipeline_stages"].append("Stage 2: Emission sources and factors bootstrapped")

        # ── Stage 3: Calculate Emissions ─────────────────────────────────
        logger.info("Stage 3: Calculating emissions")
        emission_records = self.emission_calc.calculate_and_store(
            factory_id, period_start, period_end, bootstrap_meta
        )
        total_calculated = sum(r.get("emission_value", 0) for r in emission_records
                               if isinstance(r.get("emission_value"), (int, float)))
        report["emission_records_count"] = len(emission_records)
        report["total_calculated_co2_kg"] = round(total_calculated, 2) if total_calculated else None
        report["pipeline_stages"].append(f"Stage 3: {len(emission_records)} emission records calculated")

        if not emission_records:
            report["warnings"].append("No measurements found for emission calculation. Ensure measurements are ingested.")
            report["status"] = "INCOMPLETE"
            return report

        # ── Stage 4: Contribution Analysis ──────────────────────────────
        logger.info("Stage 4: Source contribution analysis")
        contribution = self.contribution.analyze_and_store(
            factory_id, period_start, period_end, emission_type
        )
        report["contribution"] = contribution
        report["pipeline_stages"].append("Stage 4: Source contribution analysis stored")

        # ── Stage 5: Feature Engineering ────────────────────────────────
        logger.info("Stage 5: Feature engineering")
        features = self.feature_eng.engineer_features(
            factory_id, org_id, available_metrics, period_start, period_end, emission_type
        )
        feature_matrix = self.feature_eng.get_feature_matrix(
            factory_id, period_start, period_end, emission_type
        )
        report["features"] = {
            key: value[:3] if isinstance(value, list) else value
            for key, value in features.items()
        }
        report["feature_matrix_rows"] = len(feature_matrix)
        report["pipeline_stages"].append(f"Stage 5: {len(features)} feature sets computed")

        # ── Stage 6: ML Attribution ──────────────────────────────────────
        logger.info("Stage 6: ML attribution (Random Forest + SHAP)")
        attribution = {}
        if len(feature_matrix) >= 5:
            try:
                attribution = self.ml_engine.run_attribution(
                    factory_id, feature_matrix, period_start, period_end
                )
                report["ml_attribution"] = attribution
                report["pipeline_stages"].append("Stage 6: ML attribution computed with SHAP")
            except Exception as e:
                self.conn.rollback()
                report["warnings"].append(f"ML attribution error: {e}")
                attribution = {}
                report["pipeline_stages"].append("Stage 6: ML attribution skipped due to error")
        else:
            report["warnings"].append("Insufficient data for ML attribution (need ≥ 5 rows)")
            report["pipeline_stages"].append("Stage 6: ML attribution skipped — insufficient data")

        # ── Stage 7: Root-Cause Interpretation ──────────────────────────
        logger.info("Stage 7: Root-cause pattern detection")
        root_cause = self._root_cause_interpretation(feature_matrix, attribution)
        report["root_cause"] = root_cause
        report["pipeline_stages"].append(f"Stage 7: {len(root_cause.get('patterns', []))} operational patterns identified")

        # ── Stage 8: Find Applicable Alternatives ───────────────────────
        logger.info("Stage 8: Finding applicable alternatives")
        self.alt_kb.seed_alternatives()  # idempotent
        applicable_alts = self.alt_kb.find_applicable(industry_type, available_metrics)
        report["applicable_alternatives_count"] = len(applicable_alts)
        report["pipeline_stages"].append(f"Stage 8: {len(applicable_alts)} alternatives identified")

        # ── Stage 9: Impact Calculation ──────────────────────────────────
        logger.info("Stage 9: Calculating alternative impacts")
        impacts = self.impact_calc.calculate_impacts(
            factory_id, applicable_alts, period_start, period_end
        )
        report["alternative_impacts"] = [
            {k: v for k, v in imp.items()
             if k in ["alternative_name", "category", "reduction_pct_of_total",
                      "absolute_reduction_kg", "feasibility_score", "capex_range_usd",
                      "payback_years", "trl", "affected_sources"]}
            for imp in impacts
        ]
        report["pipeline_stages"].append(f"Stage 9: Impacts calculated for {len(impacts)} alternatives")

        # ── Stage 10: Ranking & Recommendation ──────────────────────────
        logger.info("Stage 10: MCDA ranking and recommendation")
        hotspot_source_id = contribution.get("hotspot_source_id")
        hotspot_name = contribution.get("hotspot_source_name", "Primary Source")
        ca_id = contribution.get("contribution_analysis_id")

        if impacts and hotspot_source_id and ca_id:
            recommendation = self.rec_engine.rank_and_recommend(
                factory_id=factory_id,
                contribution_analysis_id=ca_id,
                emission_source_id=hotspot_source_id,
                hotspot_name=hotspot_name,
                period_start=period_start,
                period_end=period_end,
                impacts=impacts,
                weights=mcda_weights
            )
            report["recommendation"] = recommendation
            report["pipeline_stages"].append("Stage 10: Recommendation ranked and stored")
        else:
            report["warnings"].append("Could not generate recommendation — missing hotspot or impacts")
            report["pipeline_stages"].append("Stage 10: Recommendation skipped")

        # ── Final Summary ────────────────────────────────────────────────
        report["status"] = "COMPLETE"
        report["summary"] = self._build_summary(report)
        logger.info(f"Analysis pipeline complete for factory {factory['name']}")
        return report

    def _build_summary(self, report: Dict[str, Any]) -> Dict[str, Any]:
        """Assembles the final human-readable executive summary."""
        contrib = report.get("contribution", {})
        rec = report.get("recommendation", {})
        root = report.get("root_cause", {})
        top_rec = rec.get("top_recommendation", {})

        patterns_text = [p["interpretation"] for p in root.get("patterns", [])]

        return {
            "EMISSION_HOTSPOT": contrib.get("hotspot_source_name"),
            "HOTSPOT_CONTRIBUTION_PCT": contrib.get("hotspot_contribution_pct"),
            "TOTAL_CO2_KG_ANALYZED": contrib.get("total_emission_kg"),
            "SOURCE_BREAKDOWN": [
                {
                    "source": s["source_name"],
                    "emission_kg": s["emission_value"],
                    "pct": s["contribution_pct"]
                }
                for s in contrib.get("sources", [])
            ],
            "OBSERVED_OPERATIONAL_PATTERNS": patterns_text,
            "TOP_RECOMMENDATION": {
                "name": top_rec.get("name"),
                "estimated_co2_reduction_kg": top_rec.get("absolute_reduction_kg"),
                "reduction_pct_of_total": top_rec.get("reduction_pct_of_total"),
                "feasibility_score": top_rec.get("feasibility_score"),
                "capex_range": top_rec.get("capex_range"),
                "payback_years": top_rec.get("payback_years"),
                "mcda_score": top_rec.get("mcda_score"),
            },
            "ALL_ALTERNATIVES_RANKED": [
                f"#{a['rank']} {a['name']} — {a['reduction_pct_of_total']:.1f}% total reduction, "
                f"score {a['mcda_score']:.2f}"
                for a in rec.get("ranked_alternatives", [])
            ],
            "CAVEATS": [
                "Emission factors are DEMONSTRATION ASSUMPTIONS — not site-validated",
                "ML attribution used 10 samples — insufficient for production ML models",
                "Impact estimates are illustrative — real deployment requires techno-economic assessment",
                "Correlation patterns do NOT imply causation without further investigation"
            ]
        }
