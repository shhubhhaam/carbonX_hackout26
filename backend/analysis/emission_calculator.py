"""
PART 1 — EMISSION CALCULATOR
============================
Implements:  Activity × EmissionFactor = EmissionValue
Stores immutable EmissionRecord rows — raw Measurements are NEVER overwritten.

⚠️  Emission factors used here are DEMONSTRATION ASSUMPTIONS only.
    They are NOT endorsed as universally valid industrial values.
    Real-world analysis requires site-specific, accredited factors.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from psycopg2.extras import RealDictCursor, Json

logger = logging.getLogger("EmissionCalculator")

# ---------------------------------------------------------------------------
# Demonstration Emission Factors (clearly flagged as illustrative)
# ---------------------------------------------------------------------------
DEMO_EMISSION_FACTORS: Dict[str, Dict[str, Any]] = {
    "Coal Consumption": {
        "factor_value": 2.4,
        "factor_unit": "kg_CO2/kg_coal",
        "emission_type": "CO2",
        "methodology": "IPCC 2019 (DEMONSTRATION ASSUMPTION — not site-validated)",
        "source_name": "Blast Furnace (Coal)",
        "source_category": "stationary_combustion",
    },
    "Natural Gas": {
        "factor_value": 2.0,
        "factor_unit": "kg_CO2/m3_gas",
        "emission_type": "CO2",
        "methodology": "GHG Protocol Scope 1 (DEMONSTRATION ASSUMPTION)",
        "source_name": "Boiler (Natural Gas)",
        "source_category": "stationary_combustion",
    },
    "Electricity": {
        "factor_value": 0.7,
        "factor_unit": "kg_CO2/kWh",
        "emission_type": "CO2",
        "methodology": "National Grid Average — Scope 2 (DEMONSTRATION ASSUMPTION)",
        "source_name": "Electricity Consumption",
        "source_category": "electricity_consumption",
    },
}


class EmissionCalculator:
    """
    Calculates emissions from raw measurements using registered emission factors.
    Stores results in emission_records. Never touches measurements table.
    """

    def __init__(self, conn):
        self.conn = conn

    # ------------------------------------------------------------------
    # Bootstrap: ensure emission sources and factors exist for demo1
    # ------------------------------------------------------------------
    def bootstrap_demo_sources_and_factors(
        self,
        factory_id: str,
        org_id: str,
        emission_type: str = "CO2"
    ) -> Dict[str, Any]:
        """
        Creates (idempotently) emission_sources and emission_factors
        for the steel demo factory using the DEMO_EMISSION_FACTORS catalog.
        Returns mapping: metric_name → emission_source_id
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Fetch CO2 emission type id
            cur.execute("SELECT id FROM emission_types WHERE name = %s;", (emission_type,))
            co2_type = cur.fetchone()
            if not co2_type:
                raise ValueError(f"Emission type '{emission_type}' not found")
            co2_type_id = str(co2_type["id"])

            source_map: Dict[str, str] = {}  # metric_name → source_id
            factor_map: Dict[str, str] = {}  # metric_name → factor_id

            for metric_name, cfg in DEMO_EMISSION_FACTORS.items():
                # Upsert emission_source
                cur.execute(
                    """
                    INSERT INTO emission_sources (factory_id, name, source_category, description)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                    """,
                    (factory_id, cfg["source_name"], cfg["source_category"],
                     f"Auto-created for demo: {metric_name}")
                )
                row = cur.fetchone()
                if not row:
                    cur.execute(
                        "SELECT id FROM emission_sources WHERE factory_id=%s AND name=%s;",
                        (factory_id, cfg["source_name"])
                    )
                    row = cur.fetchone()
                source_id = str(row["id"])
                source_map[metric_name] = source_id

                # Fetch metric_definition id
                cur.execute(
                    "SELECT id FROM metric_definitions WHERE factory_id=%s AND LOWER(name)=LOWER(%s);",
                    (factory_id, metric_name)
                )
                md_row = cur.fetchone()
                if not md_row:
                    continue
                md_id = str(md_row["id"])

                # Upsert emission_factor
                cur.execute(
                    """
                    INSERT INTO emission_factors (
                        emission_type_id, activity_metric_definition_id, emission_source_id,
                        factor_value, factor_unit, methodology, valid_from, version
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, '2024-01-01', 1)
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                    """,
                    (co2_type_id, md_id, source_id,
                     cfg["factor_value"], cfg["factor_unit"], cfg["methodology"])
                )
                ef_row = cur.fetchone()
                if not ef_row:
                    cur.execute(
                        """
                        SELECT ef.id FROM emission_factors ef
                        WHERE ef.emission_source_id = %s
                          AND ef.emission_type_id = %s
                          AND ef.factor_value = %s
                        LIMIT 1;
                        """,
                        (source_id, co2_type_id, cfg["factor_value"])
                    )
                    ef_row = cur.fetchone()
                factor_map[metric_name] = str(ef_row["id"])

            self.conn.commit()
            logger.info(f"Bootstrapped {len(source_map)} emission sources and factors for factory {factory_id}")
            return {
                "sources": source_map,
                "factors": factor_map,
                "co2_type_id": co2_type_id,
                "emission_type": emission_type,
            }

    # ------------------------------------------------------------------
    # Core Calculation
    # ------------------------------------------------------------------
    def calculate_and_store(
        self,
        factory_id: str,
        period_start: datetime,
        period_end: datetime,
        bootstrap_meta: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Fetches VALIDATED measurements for each activity metric,
        multiplies by the emission factor, and stores EmissionRecord rows.
        Returns a list of calculated emission records.
        """
        source_map = bootstrap_meta["sources"]
        factor_map = bootstrap_meta["factors"]
        co2_type_id = bootstrap_meta["co2_type_id"]

        records = []
        with self.conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM emission_records
                WHERE factory_id = %s
                                    AND period_start < %s
                                    AND period_end > %s;
                """,
                                (factory_id, period_end, period_start)
            )
            self.conn.commit()

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            for metric_name, cfg in DEMO_EMISSION_FACTORS.items():
                source_id = source_map.get(metric_name)
                factor_id = factor_map.get(metric_name)
                if not source_id or not factor_id:
                    continue

                # Fetch all measurements for this metric in period
                cur.execute(
                    """
                    SELECT m.id, m.numeric_value, m.raw_unit, m.recorded_at,
                           m.period_start, m.period_end
                    FROM measurements m
                    JOIN metric_definitions md ON md.id = m.metric_definition_id
                    WHERE m.factory_id = %s
                      AND LOWER(md.name) = LOWER(%s)
                      AND m.recorded_at >= %s
                      AND m.recorded_at <= %s
                      AND m.quality_status = 'VALIDATED'
                      AND m.numeric_value IS NOT NULL
                    ORDER BY m.recorded_at;
                    """,
                    (factory_id, metric_name, period_start, period_end)
                )
                measurements = cur.fetchall()
                logger.info(f"Found {len(measurements)} measurements for {metric_name}")

                for meas in measurements:
                    activity_value = float(meas["numeric_value"])
                    emission_value = round(activity_value * cfg["factor_value"], 4)

                    ps = meas["period_start"] or meas["recorded_at"]
                    pe = meas["period_end"] or meas["recorded_at"]

                    cur.execute(
                        """
                        INSERT INTO emission_records (
                            factory_id, emission_source_id, emission_type_id,
                            emission_factor_id, measurement_id,
                            period_start, period_end,
                            activity_value, activity_unit,
                            emission_value, emission_unit,
                            calculation_method, calculation_inputs, is_estimated
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id, emission_value, emission_source_id, period_start;
                        """,
                        (
                            factory_id, source_id, co2_type_id,
                            factor_id, str(meas["id"]),
                            ps, pe,
                            activity_value, meas["raw_unit"] or "",
                            emission_value, "kg",
                            "activity_value × emission_factor",
                            Json({
                                "metric": metric_name,
                                "raw_value": activity_value,
                                "factor": cfg["factor_value"],
                                "factor_unit": cfg["factor_unit"],
                                "formula": f"{activity_value} × {cfg['factor_value']} = {emission_value} kg CO2",
                                "disclaimer": "DEMONSTRATION ASSUMPTION — not site-validated"
                            }),
                            False
                        )
                    )
                    rec = dict(cur.fetchone())
                    rec["metric_name"] = metric_name
                    rec["source_name"] = cfg["source_name"]
                    rec["activity_value"] = activity_value
                    rec["factor_value"] = cfg["factor_value"]
                    records.append(rec)

            self.conn.commit()

        logger.info(f"Stored {len(records)} emission records for factory {factory_id}")
        return records

    def get_emission_records(
        self,
        factory_id: str,
        period_start: datetime,
        period_end: datetime
    ) -> List[Dict[str, Any]]:
        """Retrieve previously calculated emission records with source names."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT er.*, es.name as source_name, es.source_category,
                       et.name as emission_type_name, ef.factor_value, ef.factor_unit,
                       ef.methodology
                FROM emission_records er
                JOIN emission_sources es ON es.id = er.emission_source_id
                JOIN emission_types et ON et.id = er.emission_type_id
                JOIN emission_factors ef ON ef.id = er.emission_factor_id
                WHERE er.factory_id = %s
                  AND er.period_start < %s
                  AND er.period_end > %s
                ORDER BY er.period_start, es.name;
                """,
                (factory_id, period_end, period_start)
            )
            return [dict(r) for r in cur.fetchall()]
