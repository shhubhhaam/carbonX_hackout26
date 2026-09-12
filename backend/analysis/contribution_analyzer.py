"""
PART 2 — EMISSION CONTRIBUTION ANALYZER
========================================
Aggregates emission records by source, calculates percentage contributions,
identifies the primary hotspot, and stores results in contribution_analyses.

Expected demonstration result for ABC Steel (10-day period):
    Furnace (Coal)       ≈ 57.3%
    Electricity          ≈ 25.5%
    Boiler (Natural Gas) ≈ 17.2%

These values are CALCULATED from actual data — not hard-coded.
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("ContributionAnalyzer")


class ContributionAnalyzer:
    """
    Groups emission records by source, computes % contribution,
    ranks them, and identifies the dominant hotspot.
    """

    def __init__(self, conn):
        self.conn = conn

    def analyze_and_store(
        self,
        factory_id: str,
        period_start: datetime,
        period_end: datetime,
        emission_type_name: str = "CO2"
    ) -> Dict[str, Any]:
        """
        1. Aggregates total emission per source over the period.
        2. Calculates % contribution of each source.
        3. Ranks sources descending.
        4. Stores ContributionAnalysis record.
        5. Returns structured result with hotspot identified.
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Resolve emission type id
            cur.execute("SELECT id FROM emission_types WHERE name = %s;", (emission_type_name,))
            et_row = cur.fetchone()
            if not et_row:
                raise ValueError(f"Emission type '{emission_type_name}' not found")
            et_id = str(et_row["id"])

            # Aggregate per source
            cur.execute(
                """
                SELECT
                    (ARRAY_AGG(es.id ORDER BY es.id))[1] as source_id,
                    es.name as source_name,
                    es.source_category,
                    SUM(er.emission_value) as total_emission,
                    er.emission_unit,
                    COUNT(*) as record_count
                FROM emission_records er
                JOIN emission_sources es ON es.id = er.emission_source_id
                WHERE er.factory_id = %s
                  AND er.emission_type_id = %s
                  AND er.period_start < %s
                  AND er.period_end > %s
                GROUP BY es.name, es.source_category, er.emission_unit
                ORDER BY total_emission DESC;
                """,
                (factory_id, et_id, period_end, period_start)
            )
            source_rows = cur.fetchall()

        if not source_rows:
            raise ValueError("No emission records found for the given period. Run EmissionCalculator first.")

        # Calculate totals and percentages
        grand_total = sum(float(r["total_emission"]) for r in source_rows)
        emission_unit = source_rows[0]["emission_unit"] if source_rows else "kg"

        contributions = []
        primary_source_id = None
        for rank, row in enumerate(source_rows, start=1):
            source_total = float(row["total_emission"])
            pct = round((source_total / grand_total) * 100, 2) if grand_total > 0 else 0.0
            entry = {
                "rank": rank,
                "source_id": str(row["source_id"]),
                "source_name": row["source_name"],
                "source_category": row["source_category"],
                "emission_value": round(source_total, 2),
                "emission_unit": row["emission_unit"],
                "contribution_pct": pct,
                "record_count": int(row["record_count"]),
            }
            contributions.append(entry)
            if rank == 1:
                primary_source_id = str(row["source_id"])

        # Store in contribution_analyses
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO contribution_analyses (
                    factory_id, emission_type_id,
                    analysis_period_start, analysis_period_end,
                    total_emission_value, total_emission_unit,
                    source_contributions, primary_hotspot_source_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at;
                """,
                (
                    factory_id, et_id,
                    period_start, period_end,
                    round(grand_total, 2), emission_unit,
                    Json(contributions),
                    primary_source_id
                )
            )
            ca_row = dict(cur.fetchone())
            self.conn.commit()

        result = {
            "contribution_analysis_id": str(ca_row["id"]),
            "factory_id": factory_id,
            "emission_type": emission_type_name,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_emission_kg": round(grand_total, 2),
            "emission_unit": emission_unit,
            "hotspot_source_id": primary_source_id,
            "hotspot_source_name": contributions[0]["source_name"] if contributions else None,
            "hotspot_contribution_pct": contributions[0]["contribution_pct"] if contributions else None,
            "sources": contributions,
        }
        logger.info(
            f"Contribution analysis: Total={grand_total:.0f} kg CO2 | "
            f"Hotspot='{result['hotspot_source_name']}' ({result['hotspot_contribution_pct']}%)"
        )
        return result

    def get_latest(self, factory_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the most recent contribution analysis for a factory."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT ca.*, et.name as emission_type_name, es.name as hotspot_source_name
                FROM contribution_analyses ca
                JOIN emission_types et ON et.id = ca.emission_type_id
                LEFT JOIN emission_sources es ON es.id = ca.primary_hotspot_source_id
                WHERE ca.factory_id = %s
                ORDER BY ca.created_at DESC
                LIMIT 1;
                """,
                (factory_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None
