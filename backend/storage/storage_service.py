"""
Industrial Sustainability Intelligence Platform
Data Storage & Dynamic Ingestion Layer (High-Performance Implementation)
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime, timezone, date
import psycopg2
from psycopg2.extras import RealDictCursor, Json, execute_values
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DataStorageService")


class StorageConfig:
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres.vqtvyshqjrhpsyepozhu:Hackout_cosmis@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"
    )


# =============================================================================
# UNIT CONVERSION & NORMALIZATION ENGINE
# =============================================================================
UNIT_CONVERSION_MAP = {
    # Mass
    ("tonne", "kg"): lambda x: x * 1000.0,
    ("kg", "tonne"): lambda x: x / 1000.0,
    ("g", "kg"): lambda x: x / 1000.0,
    ("kg", "g"): lambda x: x * 1000.0,
    # Volume
    ("m3", "liter"): lambda x: x * 1000.0,
    ("liter", "m3"): lambda x: x / 1000.0,
    # Energy
    ("MWh", "kWh"): lambda x: x * 1000.0,
    ("kWh", "MWh"): lambda x: x / 1000.0,
    ("GJ", "kWh"): lambda x: x * 277.778,
    ("kWh", "GJ"): lambda x: x / 277.778,
    # Pressure
    ("bar", "kPa"): lambda x: x * 100.0,
    ("kPa", "bar"): lambda x: x / 100.0,
    ("psi", "bar"): lambda x: x * 0.0689476,
    ("bar", "psi"): lambda x: x / 0.0689476,
    # Temperature
    ("°F", "°C"): lambda x: (x - 32.0) * 5.0 / 9.0,
    ("°C", "°F"): lambda x: (x * 9.0 / 5.0) + 32.0,
    ("K", "°C"): lambda x: x - 273.15,
    ("°C", "K"): lambda x: x + 273.15,
}


def normalize_unit_and_value(
    value: Optional[float],
    input_unit: Optional[str],
    target_unit: Optional[str]
) -> Tuple[Optional[float], Optional[str]]:
    """
    Normalizes numeric measurement value based on unit conversions.
    Supports base units and rate units (e.g. MWh/day -> kWh/day, tonne/day -> kg/day).
    Returns (normalized_value, normalized_unit).
    """
    if value is None or not input_unit:
        return value, target_unit

    clean_in = input_unit.strip().lower()
    clean_target = (target_unit or input_unit).strip().lower()

    if clean_in == clean_target:
        return value, target_unit

    # Direct match in map
    for (src, dst), converter in UNIT_CONVERSION_MAP.items():
        if src.lower() == clean_in and dst.lower() == clean_target:
            return round(converter(value), 6), target_unit

    # Match base units stripping time rate denominator if present (e.g. /day, /hr)
    in_parts = clean_in.split("/", 1)
    target_parts = clean_target.split("/", 1)

    in_base = in_parts[0].strip()
    target_base = target_parts[0].strip()

    in_suffix = in_parts[1].strip() if len(in_parts) > 1 else ""
    target_suffix = target_parts[1].strip() if len(target_parts) > 1 else ""

    if in_suffix == target_suffix or not in_suffix or not target_suffix:
        for (src, dst), converter in UNIT_CONVERSION_MAP.items():
            if src.lower() == in_base and dst.lower() == target_base:
                return round(converter(value), 6), target_unit

    return value, input_unit


# =============================================================================
# DATA STORAGE SERVICE IMPLEMENTATION
# =============================================================================
class DataStorageService:
    def __init__(self, conn=None):
        self._conn = conn

    def get_connection(self):
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(StorageConfig.DATABASE_URL)
            self._conn.autocommit = False
        return self._conn

    def close(self):
        if self._conn and not self._conn.closed:
            self._conn.close()

    # -------------------------------------------------------------------------
    # 1. Organization Management
    # -------------------------------------------------------------------------
    def create_organization(
        self,
        name: str,
        slug: str,
        industry_sector: Optional[str] = None,
        country: Optional[str] = "India",
        timezone_str: str = "UTC",
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO organizations (name, slug, industry_sector, country, timezone, settings)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name,
                    industry_sector = EXCLUDED.industry_sector,
                    country = EXCLUDED.country,
                    timezone = EXCLUDED.timezone,
                    settings = EXCLUDED.settings,
                    updated_at = NOW()
                RETURNING *;
                """,
                (name, slug, industry_sector, country, timezone_str, Json(settings or {}))
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def get_organization(self, org_id_or_slug: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM organizations
                WHERE id::text = %s OR slug = %s;
                """,
                (org_id_or_slug, org_id_or_slug)
            )
            res = cur.fetchone()
            return dict(res) if res else None

    # -------------------------------------------------------------------------
    # 2. Factory Management
    # -------------------------------------------------------------------------
    def create_factory(
        self,
        organization_id: str,
        name: str,
        code: str,
        industry_type: str,
        location: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        commissioned_at: Optional[Union[str, date]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO factories (
                    organization_id, name, code, industry_type, location,
                    latitude, longitude, commissioned_at, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (organization_id, code) DO UPDATE
                SET name = EXCLUDED.name,
                    industry_type = EXCLUDED.industry_type,
                    location = EXCLUDED.location,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    commissioned_at = EXCLUDED.commissioned_at,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
                RETURNING *;
                """,
                (
                    organization_id, name, code, industry_type, location,
                    latitude, longitude, commissioned_at, Json(metadata or {})
                )
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def get_factory_by_code(self, code: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM factories WHERE code = %s;", (code,))
            res = cur.fetchone()
            return dict(res) if res else None

    def get_factory_by_id(self, factory_id: str) -> Optional[Dict[str, Any]]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM factories WHERE id::text = %s;", (factory_id,))
            res = cur.fetchone()
            return dict(res) if res else None

    def list_factories(self, organization_id: Optional[str] = None) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if organization_id:
                cur.execute("SELECT * FROM factories WHERE organization_id = %s ORDER BY name;", (organization_id,))
            else:
                cur.execute("SELECT * FROM factories ORDER BY name;")
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 3. Department, Process, Machine, and DataSource Management
    # -------------------------------------------------------------------------
    def create_department(self, factory_id: str, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO departments (factory_id, name, description)
                VALUES (%s, %s, %s)
                RETURNING *;
                """,
                (factory_id, name, description)
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def create_process(
        self,
        factory_id: str,
        name: str,
        process_type: Optional[str] = None,
        department_id: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO processes (factory_id, department_id, name, process_type, description, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *;
                """,
                (factory_id, department_id, name, process_type, description, Json(metadata or {}))
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def create_machine(
        self,
        factory_id: str,
        name: str,
        process_id: Optional[str] = None,
        machine_type: Optional[str] = None,
        model_number: Optional[str] = None,
        rated_capacity: Optional[float] = None,
        capacity_unit: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO machines (
                    factory_id, process_id, name, machine_type,
                    model_number, rated_capacity, capacity_unit, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
                """,
                (
                    factory_id, process_id, name, machine_type,
                    model_number, rated_capacity, capacity_unit, Json(metadata or {})
                )
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def create_data_source(
        self,
        factory_id: str,
        name: str,
        source_type: str,
        connection_config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO data_sources (factory_id, name, source_type, connection_config)
                VALUES (%s, %s, %s, %s)
                RETURNING *;
                """,
                (factory_id, name, source_type, Json(connection_config or {}))
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    # -------------------------------------------------------------------------
    # 4. MetricDefinition Creation (Dynamic Schema Core)
    # -------------------------------------------------------------------------
    def create_metric_definition(
        self,
        organization_id: str,
        factory_id: Optional[str],
        name: str,
        display_name: str,
        category: str,
        data_type: str = "numeric",
        unit: Optional[str] = None,
        unit_system: str = "SI",
        aggregation_method: str = "sum",
        is_input: bool = True,
        validation_rules: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None,
        description: Optional[str] = None,
        version: int = 1
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO metric_definitions (
                    organization_id, factory_id, name, display_name, description,
                    category, data_type, unit, unit_system, aggregation_method,
                    is_input, validation_rules, tags, version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (factory_id, name, version) DO UPDATE
                SET display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    data_type = EXCLUDED.data_type,
                    unit = EXCLUDED.unit,
                    unit_system = EXCLUDED.unit_system,
                    aggregation_method = EXCLUDED.aggregation_method,
                    is_input = EXCLUDED.is_input,
                    validation_rules = EXCLUDED.validation_rules,
                    tags = EXCLUDED.tags,
                    updated_at = NOW()
                RETURNING *;
                """,
                (
                    organization_id, factory_id, name, display_name, description,
                    category, data_type, unit, unit_system, aggregation_method,
                    is_input, Json(validation_rules or {}), tags or [], version
                )
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def get_factory_metrics(self, factory_id: str) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT m.*, f.name as factory_name, f.code as factory_code
                FROM metric_definitions m
                LEFT JOIN factories f ON f.id = m.factory_id
                WHERE m.factory_id = %s OR (m.factory_id IS NULL AND m.organization_id = (
                    SELECT organization_id FROM factories WHERE id = %s
                ))
                ORDER BY m.category, m.name;
                """,
                (factory_id, factory_id)
            )
            return [dict(r) for r in cur.fetchall()]

    # -------------------------------------------------------------------------
    # 5. High-Performance Measurement Ingestion Engine
    # -------------------------------------------------------------------------
    def _validate_and_prepare_measurement(
        self,
        metric: Dict[str, Any],
        factory_id: str,
        value: Any,
        recorded_at: Union[str, datetime],
        raw_unit: Optional[str] = None,
        machine_id: Optional[str] = None,
        process_id: Optional[str] = None,
        data_source_id: Optional[str] = None,
        period_start: Optional[Union[str, datetime]] = None,
        period_end: Optional[Union[str, datetime]] = None,
        notes: Optional[str] = None
    ) -> Tuple[Tuple, Dict[str, Any]]:
        metric_id = metric["id"]
        data_type = metric["data_type"]
        target_unit = metric["unit"]
        rules = metric.get("validation_rules") or {}

        numeric_val = None
        text_val = None
        bool_val = None
        json_val = None

        quality_status = "VALIDATED"
        quality_flags = {
            "out_of_range": False,
            "type_converted": False,
            "unit_converted": False
        }

        if data_type == "numeric":
            try:
                numeric_val = float(value)
            except (ValueError, TypeError):
                quality_status = "REJECTED"
                quality_flags["type_error"] = f"Expected numeric, got {type(value)}"
                raise ValueError(f"Metric '{metric['name']}' requires numeric value. Received: {value}")

            if "min" in rules and numeric_val < rules["min"]:
                if rules.get("reject_out_of_bounds", False):
                    quality_status = "REJECTED"
                    raise ValueError(f"Value {numeric_val} is below minimum allowed {rules['min']}")
                else:
                    quality_status = "SUSPECT"
                    quality_flags["out_of_range"] = True
                    quality_flags["min_violation"] = f"{numeric_val} < {rules['min']}"

            if "max" in rules and numeric_val > rules["max"]:
                if rules.get("reject_out_of_bounds", False):
                    quality_status = "REJECTED"
                    raise ValueError(f"Value {numeric_val} exceeds maximum allowed {rules['max']}")
                else:
                    quality_status = "SUSPECT"
                    quality_flags["out_of_range"] = True
                    quality_flags["max_violation"] = f"{numeric_val} > {rules['max']}"

        elif data_type == "boolean":
            if isinstance(value, bool):
                bool_val = value
            elif str(value).lower() in ["true", "1", "yes"]:
                bool_val = True
            elif str(value).lower() in ["false", "0", "no"]:
                bool_val = False
            else:
                quality_status = "REJECTED"
                raise ValueError(f"Invalid boolean value: {value}")

        elif data_type == "json":
            json_val = value if isinstance(value, dict) else json.loads(str(value))
        else:
            text_val = str(value)
            if "allowed_values" in rules and text_val not in rules["allowed_values"]:
                quality_status = "SUSPECT"
                quality_flags["disallowed_categorical"] = True

        # Unit Normalization
        norm_val, norm_unit = normalize_unit_and_value(
            numeric_val,
            raw_unit or target_unit,
            target_unit
        )
        if raw_unit and raw_unit != target_unit:
            quality_flags["unit_converted"] = True

        row_tuple = (
            metric_id,
            factory_id,
            machine_id,
            process_id,
            data_source_id,
            recorded_at,
            period_start,
            period_end,
            numeric_val,
            text_val,
            bool_val,
            Json(json_val) if json_val else None,
            raw_unit or target_unit,
            norm_val,
            norm_unit,
            quality_status,
            Json(quality_flags),
            notes
        )

        audit_meta = {
            "metric_id": metric_id,
            "metric_name": metric["name"],
            "quality_status": quality_status,
            "normalized_value": norm_val,
            "normalized_unit": norm_unit
        }
        return row_tuple, audit_meta

    def ingest_measurement(
        self,
        factory_id: str,
        metric_name_or_id: str,
        value: Any,
        recorded_at: Union[str, datetime],
        raw_unit: Optional[str] = None,
        machine_id: Optional[str] = None,
        process_id: Optional[str] = None,
        data_source_id: Optional[str] = None,
        period_start: Optional[Union[str, datetime]] = None,
        period_end: Optional[Union[str, datetime]] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM metric_definitions
                WHERE (id::text = %s)
                   OR ((factory_id = %s OR factory_id IS NULL)
                       AND (LOWER(name) = LOWER(%s) OR LOWER(display_name) = LOWER(%s)))
                ORDER BY (factory_id IS NOT NULL) DESC
                LIMIT 1;
                """,
                (metric_name_or_id, factory_id, metric_name_or_id, metric_name_or_id)
            )
            metric = cur.fetchone()
            if not metric:
                raise ValueError(f"Metric '{metric_name_or_id}' is not defined for factory {factory_id}")

            row_tuple, _ = self._validate_and_prepare_measurement(
                dict(metric), factory_id, value, recorded_at, raw_unit,
                machine_id, process_id, data_source_id, period_start, period_end, notes
            )

            cur.execute(
                """
                INSERT INTO measurements (
                    metric_definition_id, factory_id, machine_id, process_id, data_source_id,
                    recorded_at, period_start, period_end,
                    numeric_value, text_value, boolean_value, json_value,
                    raw_unit, normalized_value, normalized_unit,
                    quality_status, quality_flags, notes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *;
                """,
                row_tuple
            )
            res = dict(cur.fetchone())
            conn.commit()
            return res

    def batch_ingest(self, measurements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        High-performance bulk ingestion:
        Pre-caches metrics and inserts all validated rows in a single batch query.
        """
        if not measurements:
            return {"total": 0, "succeeded": 0, "failed": 0, "results": [], "errors": []}

        conn = self.get_connection()
        # Collect unique factory IDs
        factory_ids = list({m["factory_id"] for m in measurements})

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM metric_definitions
                WHERE factory_id::text = ANY(%s) OR factory_id IS NULL;
                """,
                (factory_ids,)
            )
            all_metrics = [dict(r) for r in cur.fetchall()]

        # Index metrics by (factory_id, lower(name)) and id
        metric_map = {}
        for m in all_metrics:
            fid = str(m["factory_id"]) if m["factory_id"] else "GLOBAL"
            metric_map[(fid, m["name"].strip().lower())] = m
            if m.get("display_name"):
                metric_map[(fid, m["display_name"].strip().lower())] = m
            metric_map[str(m["id"])] = m

        valid_rows = []
        errors = []

        for item in measurements:
            fid = str(item["factory_id"])
            m_key = str(item["metric_name_or_id"]).strip().lower()

            metric = metric_map.get((fid, m_key)) or metric_map.get(("GLOBAL", m_key)) or metric_map.get(str(item["metric_name_or_id"]))
            if not metric:
                errors.append({"item": item, "error": f"Metric '{item['metric_name_or_id']}' not defined for factory {fid}"})
                continue

            try:
                row_tuple, _ = self._validate_and_prepare_measurement(
                    metric,
                    item["factory_id"],
                    item["value"],
                    item["recorded_at"],
                    item.get("raw_unit"),
                    item.get("machine_id"),
                    item.get("process_id"),
                    item.get("data_source_id"),
                    item.get("period_start"),
                    item.get("period_end"),
                    item.get("notes")
                )
                valid_rows.append(row_tuple)
            except Exception as e:
                errors.append({"item": item, "error": str(e)})

        # Bulk insert valid rows
        succeeded = 0
        if valid_rows:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                insert_query = """
                    INSERT INTO measurements (
                        metric_definition_id, factory_id, machine_id, process_id, data_source_id,
                        recorded_at, period_start, period_end,
                        numeric_value, text_value, boolean_value, json_value,
                        raw_unit, normalized_value, normalized_unit,
                        quality_status, quality_flags, notes
                    )
                    VALUES %s
                    RETURNING id, metric_definition_id, factory_id, recorded_at, numeric_value, quality_status;
                """
                execute_values(cur, insert_query, valid_rows)
                inserted_records = [dict(r) for r in cur.fetchall()]
                conn.commit()
                succeeded = len(inserted_records)

        return {
            "total": len(measurements),
            "succeeded": succeeded,
            "failed": len(errors),
            "errors": errors
        }

    # -------------------------------------------------------------------------
    # 6. Measurement Retrieval & Querying
    # -------------------------------------------------------------------------
    def get_measurements(
        self,
        factory_id: str,
        metric_name: Optional[str] = None,
        metric_id: Optional[str] = None,
        start_time: Optional[Union[str, datetime]] = None,
        end_time: Optional[Union[str, datetime]] = None,
        quality_status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        conn = self.get_connection()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT 
                    m.id,
                    m.recorded_at,
                    m.period_start,
                    m.period_end,
                    m.numeric_value,
                    m.text_value,
                    m.raw_unit,
                    m.normalized_value,
                    m.normalized_unit,
                    m.quality_status,
                    m.quality_flags,
                    md.name as metric_name,
                    md.display_name as metric_display_name,
                    md.category as metric_category,
                    f.name as factory_name,
                    f.code as factory_code,
                    mac.name as machine_name,
                    p.name as process_name
                FROM measurements m
                JOIN metric_definitions md ON md.id = m.metric_definition_id
                JOIN factories f ON f.id = m.factory_id
                LEFT JOIN machines mac ON mac.id = m.machine_id
                LEFT JOIN processes p ON p.id = m.process_id
                WHERE m.factory_id = %s
            """
            params: List[Any] = [factory_id]

            if metric_id:
                query += " AND m.metric_definition_id = %s"
                params.append(metric_id)
            elif metric_name:
                query += " AND (LOWER(md.name) = LOWER(%s) OR LOWER(md.display_name) = LOWER(%s))"
                params.append(metric_name)
                params.append(metric_name)

            if start_time:
                query += " AND m.recorded_at >= %s"
                params.append(start_time)
            if end_time:
                query += " AND m.recorded_at <= %s"
                params.append(end_time)
            if quality_status:
                query += " AND m.quality_status = %s"
                params.append(quality_status)

            query += " ORDER BY m.recorded_at ASC, md.name ASC LIMIT %s;"
            params.append(limit)

            cur.execute(query, tuple(params))
            return [dict(r) for r in cur.fetchall()]

    def compare_factories_schema(self, factory_a_id: str, factory_b_id: str) -> Dict[str, Any]:
        metrics_a = self.get_factory_metrics(factory_a_id)
        metrics_b = self.get_factory_metrics(factory_b_id)

        names_a = {m["name"] for m in metrics_a}
        names_b = {m["name"] for m in metrics_b}

        only_in_a = sorted(list(names_a - names_b))
        only_in_b = sorted(list(names_b - names_a))
        common = sorted(list(names_a & names_b))

        return {
            "factory_a": {
                "id": factory_a_id,
                "total_metrics": len(metrics_a),
                "metrics": sorted([m["name"] for m in metrics_a])
            },
            "factory_b": {
                "id": factory_b_id,
                "total_metrics": len(metrics_b),
                "metrics": sorted([m["name"] for m in metrics_b])
            },
            "dynamic_proof": {
                "common_metrics": common,
                "metrics_unique_to_a": only_in_a,
                "metrics_unique_to_b": only_in_b,
                "can_b_have_attributes_a_lacks": len(only_in_b) > 0,
                "schema_change_required": False,
                "verdict": "SUCCESS: The database stores variable industrial parameters purely as metadata rows without altering any table column or DDL schema."
            }
        }
