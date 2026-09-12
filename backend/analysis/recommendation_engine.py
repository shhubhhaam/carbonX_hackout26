"""
PART 8 — RECOMMENDATION ENGINE (MCDA Ranking)
==============================================
Ranks emission reduction alternatives using Multi-Criteria Decision Analysis (MCDA).

Scoring formula (configurable weights):
    Score = w1 × ReductionScore
          + w2 × CostEffectivenessScore
          + w3 × FeasibilityScore
          + w4 × CompatibilityScore

Default weights:
    emission_reduction:   0.50
    cost_effectiveness:   0.20
    feasibility:          0.20
    compatibility:        0.10

Weights are CONFIGURABLE — not hard-coded into business logic.
Final recommendation is derived from data, NOT pre-selected.

Stores results in:
  - recommendations
  - recommendation_alternatives
"""

import logging
import math
from typing import Any, Dict, List, Optional
from datetime import datetime
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("RecommendationEngine")

# Default MCDA weights (overridable by caller)
DEFAULT_WEIGHTS = {
    "emission_reduction": 0.50,
    "cost_effectiveness": 0.20,
    "feasibility": 0.20,
    "compatibility": 0.10,
}


class RecommendationEngine:
    """
    MCDA-based ranking and recommendation storage.
    """

    def __init__(self, conn):
        self.conn = conn

    # ------------------------------------------------------------------
    # Score normalization helpers (min-max scale to [0, 1])
    # ------------------------------------------------------------------
    @staticmethod
    def _minmax_normalize(values: List[float], invert: bool = False) -> List[float]:
        """Scale a list of floats to [0, 1]. Set invert=True for 'lower is better'."""
        min_v = min(values)
        max_v = max(values)
        if max_v == min_v:
            return [1.0 for _ in values]
        normalized = [(v - min_v) / (max_v - min_v) for v in values]
        if invert:
            normalized = [1.0 - n for n in normalized]
        return normalized

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------
    def _score_alternatives(
        self,
        impacts: List[Dict[str, Any]],
        weights: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Scores and ranks alternatives using MCDA.
        Returns impacts list with mcda_score and scoring_breakdown added.
        """
        if not impacts:
            return []

        # Extract raw values for normalization
        reductions = [a["absolute_reduction_kg"] for a in impacts]
        capex_vals = [a["capex_midpoint_usd"] if a["capex_midpoint_usd"] > 0 else 1e9 for a in impacts]
        feasibility_vals = [a["feasibility_score"] for a in impacts]
        compat_vals = [a["compatibility_score"] for a in impacts]

        # Normalize
        norm_reduction = self._minmax_normalize(reductions, invert=False)   # higher = better
        norm_cost = self._minmax_normalize(capex_vals, invert=True)          # lower CAPEX = better
        norm_feasibility = self._minmax_normalize(feasibility_vals, invert=False)
        norm_compat = self._minmax_normalize(compat_vals, invert=False)

        # Compute total score
        w = weights
        for i, alt in enumerate(impacts):
            r_score = norm_reduction[i]
            c_score = norm_cost[i]
            f_score = norm_feasibility[i]
            comp_score = norm_compat[i]

            total_score = (
                w.get("emission_reduction", 0.50) * r_score
                + w.get("cost_effectiveness", 0.20) * c_score
                + w.get("feasibility", 0.20) * f_score
                + w.get("compatibility", 0.10) * comp_score
            )

            alt["mcda_score"] = round(total_score, 4)
            alt["scoring_breakdown"] = {
                "emission_reduction_score": round(r_score, 4),
                "cost_effectiveness_score": round(c_score, 4),
                "feasibility_score_norm": round(f_score, 4),
                "compatibility_score_norm": round(comp_score, 4),
                "weights_used": w,
            }

        # Rank by score descending
        sorted_alts = sorted(impacts, key=lambda x: x["mcda_score"], reverse=True)
        for rank_i, alt in enumerate(sorted_alts, start=1):
            alt["rank"] = rank_i
            alt["is_top_recommendation"] = (rank_i == 1)

        return sorted_alts

    def _build_reasoning(self, alt: Dict[str, Any], hotspot_name: str) -> str:
        """Generate a human-readable explanation for why this alternative was ranked here."""
        rank = alt["rank"]
        name = alt["alternative_name"]
        reduction_pct = alt["reduction_pct_of_total"]
        feasibility = alt["feasibility_score"]
        score = alt["mcda_score"]

        if rank == 1:
            return (
                f"'{name}' is ranked #1 (MCDA score: {score:.2f}). "
                f"It is estimated to reduce total {hotspot_name}-related CO2 emissions by "
                f"{reduction_pct:.1f}% with a feasibility rating of {feasibility:.0%}. "
                f"The combination of substantial emission reduction and high technical readiness "
                f"makes this the most actionable intervention for the current operational state. "
                f"Note: impact estimates are illustrative assumptions — site validation required."
            )
        else:
            return (
                f"'{name}' ranked #{rank} (MCDA score: {score:.2f}). "
                f"Estimated {reduction_pct:.1f}% total CO2 reduction, "
                f"feasibility {feasibility:.0%}. "
                f"{'Lower cost effectiveness' if alt['capex_midpoint_usd'] > 5e6 else 'Higher CAPEX requirement'} "
                f"or {'implementation complexity' if feasibility < 0.7 else 'limited applicability'} "
                f"reduces ranking relative to top alternative."
            )

    # ------------------------------------------------------------------
    # Persist recommendation to DB
    # ------------------------------------------------------------------
    def store_recommendation(
        self,
        factory_id: str,
        contribution_analysis_id: str,
        emission_source_id: str,
        period_start: datetime,
        period_end: datetime,
        ranked_alternatives: List[Dict[str, Any]],
        hotspot_name: str
    ) -> str:
        """Stores recommendation header + all ranked alternatives."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get CO2 type id
            cur.execute("SELECT id FROM emission_types WHERE name='CO2';")
            co2_id = str(cur.fetchone()["id"])

            # recommendations table header
            cur.execute(
                """
                INSERT INTO recommendations (
                    factory_id, contribution_analysis_id,
                    emission_source_id, emission_type_id,
                    analysis_period_start, analysis_period_end
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (factory_id, contribution_analysis_id,
                 emission_source_id, co2_id,
                 period_start, period_end)
            )
            rec_id = str(cur.fetchone()["id"])

            # recommendation_alternatives table (one row per ranked alternative)
            for alt in ranked_alternatives:
                reasoning = self._build_reasoning(alt, hotspot_name)
                cur.execute(
                    """
                    INSERT INTO recommendation_alternatives (
                        recommendation_id, alternative_id, alternative_impact_id,
                        rank, estimated_reduction_pct, estimated_reduction_kg,
                        estimated_capex, estimated_capex_currency,
                        estimated_payback_years, feasibility_score,
                        mcda_score, mcda_weights, scoring_breakdown,
                        is_top_recommendation, reasoning
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (recommendation_id, rank) DO NOTHING;
                    """,
                    (
                        rec_id,
                        alt["alternative_id"],
                        alt["impact_id"] or None,
                        alt["rank"],
                        alt["reduction_pct_of_total"],
                        alt["absolute_reduction_kg"],
                        alt["capex_midpoint_usd"],
                        "USD",
                        alt.get("payback_years"),
                        alt["feasibility_score"],
                        alt["mcda_score"],
                        Json(alt["scoring_breakdown"]["weights_used"]),
                        Json(alt["scoring_breakdown"]),
                        alt["is_top_recommendation"],
                        reasoning
                    )
                )

            self.conn.commit()

        logger.info(f"Stored recommendation {rec_id} with {len(ranked_alternatives)} alternatives")
        return rec_id

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def rank_and_recommend(
        self,
        factory_id: str,
        contribution_analysis_id: str,
        emission_source_id: str,
        hotspot_name: str,
        period_start: datetime,
        period_end: datetime,
        impacts: List[Dict[str, Any]],
        weights: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Full MCDA ranking + DB persistence.
        Returns the complete ranked recommendation report.
        """
        effective_weights = weights or DEFAULT_WEIGHTS
        # Normalize weights to sum = 1
        total_w = sum(effective_weights.values())
        if total_w > 0:
            effective_weights = {k: v / total_w for k, v in effective_weights.items()}

        ranked = self._score_alternatives(impacts, effective_weights)
        rec_id = self.store_recommendation(
            factory_id=factory_id,
            contribution_analysis_id=contribution_analysis_id,
            emission_source_id=emission_source_id,
            period_start=period_start,
            period_end=period_end,
            ranked_alternatives=ranked,
            hotspot_name=hotspot_name
        )

        top = ranked[0] if ranked else {}

        return {
            "recommendation_id": rec_id,
            "factory_id": factory_id,
            "emission_hotspot": hotspot_name,
            "mcda_weights_used": effective_weights,
            "total_alternatives_evaluated": len(ranked),
            "top_recommendation": {
                "name": top.get("alternative_name"),
                "category": top.get("category"),
                "summary": top.get("summary"),
                "absolute_reduction_kg": top.get("absolute_reduction_kg"),
                "reduction_pct_of_total": top.get("reduction_pct_of_total"),
                "feasibility_score": top.get("feasibility_score"),
                "capex_range": top.get("capex_range_usd"),
                "payback_years": top.get("payback_years"),
                "mcda_score": top.get("mcda_score"),
                "reasoning": self._build_reasoning(top, hotspot_name),
            },
            "ranked_alternatives": [
                {
                    "rank": a["rank"],
                    "name": a["alternative_name"],
                    "category": a["category"],
                    "reduction_pct_of_total": a["reduction_pct_of_total"],
                    "absolute_reduction_kg": a["absolute_reduction_kg"],
                    "feasibility_score": a["feasibility_score"],
                    "capex_range": a["capex_range_usd"],
                    "mcda_score": a["mcda_score"],
                    "scoring_breakdown": a["scoring_breakdown"],
                    "reasoning": self._build_reasoning(a, hotspot_name),
                }
                for a in ranked
            ],
        }
