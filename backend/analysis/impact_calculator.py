"""
PART 7 — ALTERNATIVE IMPACT CALCULATOR
=======================================
For each applicable alternative, calculates:
  - Current baseline emissions (from ContributionAnalysis)
  - Estimated new emissions after applying the alternative
  - Absolute CO2 reduction (kg)
  - Percentage reduction
  - CAPEX estimate
  - Payback years
  - Feasibility score
  - Compatibility score (derived from metric/process coverage)

⚠️  Impact reductions are ILLUSTRATIVE ASSUMPTIONS for pipeline demonstration.
    They are NOT universally valid industrial facts.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from psycopg2.extras import RealDictCursor

logger = logging.getLogger("ImpactCalculator")


class ImpactCalculator:
    """
    Calculates quantified impact of each alternative against the
    current baseline emissions from the most recent ContributionAnalysis.
    """

    def __init__(self, conn):
        self.conn = conn

    def _get_source_emission(
        self,
        factory_id: str,
        period_start: datetime,
        period_end: datetime,
        source_name_fragment: Optional[str] = None
    ) -> Dict[str, float]:
        """Returns {source_name: total_kg_co2} for the analysis period."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            if source_name_fragment:
                cur.execute(
                    """
                    SELECT es.name, SUM(er.emission_value) as total
                    FROM emission_records er
                    JOIN emission_sources es ON es.id = er.emission_source_id
                    JOIN emission_types et ON et.id = er.emission_type_id
                    WHERE er.factory_id = %s
                      AND et.name = 'CO2'
                      AND er.period_start < %s AND er.period_end > %s
                      AND es.name ILIKE %s
                    GROUP BY es.name;
                    """,
                    (factory_id, period_end, period_start, f"%{source_name_fragment}%")
                )
            else:
                cur.execute(
                    """
                    SELECT es.name, SUM(er.emission_value) as total
                    FROM emission_records er
                    JOIN emission_sources es ON es.id = er.emission_source_id
                    JOIN emission_types et ON et.id = er.emission_type_id
                    WHERE er.factory_id = %s
                      AND et.name = 'CO2'
                      AND er.period_start < %s AND er.period_end > %s
                    GROUP BY es.name;
                    """,
                    (factory_id, period_end, period_start)
                )
            return {r["name"]: float(r["total"]) for r in cur.fetchall()}

    def _map_alternative_to_sources(
        self,
        alternative: Dict[str, Any],
        source_emissions: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Figures out which emission sources are affected by this alternative.
        Returns {source_name: baseline_emission_for_that_source}.
        """
        affected: Dict[str, float] = {}
        alt_cat = alternative.get("category", "")
        src_cats = alternative.get("emission_source_categories") or []

        # Map alternative category / source category → emission source names
        for src_name, src_emission in source_emissions.items():
            src_lower = src_name.lower()

            if "electricity" in alt_cat or "renewable" in alt_cat:
                if "electricity" in src_lower:
                    affected[src_name] = src_emission

            elif "efficiency" in alt_cat or "heat_recovery" in alt_cat:
                if "coal" in src_lower or "furnace" in src_lower or "boiler" in src_lower:
                    affected[src_name] = src_emission

            elif "fuel_switch" in alt_cat:
                if "coal" in src_lower or "furnace" in src_lower:
                    affected[src_name] = src_emission

            elif "electrification" in alt_cat:
                if "coal" in src_lower or "furnace" in src_lower or "boiler" in src_lower:
                    affected[src_name] = src_emission

        # If no match, apply to total (conservative fallback)
        if not affected:
            affected = dict(source_emissions)

        return affected

    def calculate_impacts(
        self,
        factory_id: str,
        alternatives: List[Dict[str, Any]],
        period_start: datetime,
        period_end: datetime,
    ) -> List[Dict[str, Any]]:
        """
        For each alternative:
        1. Identify affected emission sources
        2. Apply reduction_typical_pct to those sources
        3. Calculate absolute and % reduction
        4. Calculate compatibility score from available metrics overlap
        """
        source_emissions = self._get_source_emission(factory_id, period_start, period_end)
        total_baseline_co2 = sum(source_emissions.values())

        logger.info(f"Baseline total CO2: {total_baseline_co2:.0f} kg across {len(source_emissions)} sources")

        impact_results = []

        for alt in alternatives:
            affected_sources = self._map_alternative_to_sources(alt, source_emissions)
            if not affected_sources:
                continue

            baseline_for_alt = sum(affected_sources.values())
            reduction_pct = float(alt.get("reduction_typical_pct") or 0.0)

            absolute_reduction_kg = baseline_for_alt * (reduction_pct / 100.0)
            new_emissions_kg = baseline_for_alt - absolute_reduction_kg
            overall_pct_of_total = (absolute_reduction_kg / total_baseline_co2 * 100) if total_baseline_co2 > 0 else 0.0

            # Feasibility score (from KB)
            feasibility_score = float(alt.get("feasibility_score") or 0.5)

            # Compatibility: % of required_metrics that are actually in the factory
            req_metrics = [m.lower() for m in (alt.get("required_metrics") or [])]
            available_metric_names = self._get_factory_metric_names(factory_id)
            if req_metrics:
                matched = sum(1 for m in req_metrics if any(m in am.lower() for am in available_metric_names))
                compatibility_score = matched / len(req_metrics)
            else:
                compatibility_score = 1.0

            # Cost effectiveness: reduction_kg / capex_midpoint (normalized later)
            capex_low = float(alt.get("capex_range_low") or 0)
            capex_high = float(alt.get("capex_range_high") or 0)
            capex_midpoint = (capex_low + capex_high) / 2 if capex_high > 0 else capex_low

            impact_results.append({
                "alternative_id": str(alt["id"]),
                "alternative_name": alt["name"],
                "category": alt["category"],
                "description": alt["description"],
                "summary": alt["summary"],
                "affected_sources": list(affected_sources.keys()),
                "baseline_co2_kg": round(baseline_for_alt, 2),
                "total_baseline_co2_kg": round(total_baseline_co2, 2),
                "reduction_pct_of_affected": round(reduction_pct, 2),
                "absolute_reduction_kg": round(absolute_reduction_kg, 2),
                "new_emissions_kg": round(new_emissions_kg, 2),
                "reduction_pct_of_total": round(overall_pct_of_total, 2),
                "feasibility_score": feasibility_score,
                "compatibility_score": round(compatibility_score, 2),
                "capex_range_usd": f"${capex_low:,.0f} – ${capex_high:,.0f}" if capex_high > 0 else f"${capex_low:,.0f}+",
                "capex_midpoint_usd": capex_midpoint,
                "payback_years": alt.get("payback_years_typical"),
                "implementation_months": alt.get("implementation_time_months"),
                "trl": alt.get("technical_readiness_level"),
                "reference_source": alt.get("reference_source"),
                "impact_id": str(alt.get("impact_id") or ""),
                "disclaimer": "ILLUSTRATIVE DEMONSTRATION — not site-validated"
            })

        logger.info(f"Calculated impacts for {len(impact_results)} alternatives")
        return impact_results

    def _get_factory_metric_names(self, factory_id: str) -> List[str]:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT name FROM metric_definitions WHERE factory_id=%s AND is_active=TRUE;",
                (factory_id,)
            )
            return [r[0] for r in cur.fetchall()]
