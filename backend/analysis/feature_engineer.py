"""
PART 3 — FEATURE ENGINEER
==========================
Creates DERIVED features from raw measurements.
Never replaces or mutates original measurement records.

Supports:
  - ratio           (e.g., coal_per_ton = coal / production)
  - intensity       (e.g., emission_per_ton = total_co2 / production)
  - rolling_avg     (rolling mean over N periods)
  - rate_of_change  (day-over-day change)
  - std_dev         (variability)
  - cumulative_sum

All feature values stored in feature_definitions + feature_values tables.
"""

import logging
import numpy as np
from datetime import datetime
from typing import Any, Dict, List, Optional
import psycopg2.extensions
from psycopg2.extras import RealDictCursor, Json
import numpy as np

# Register numpy adapters for psycopg2
psycopg2.extensions.register_adapter(np.float64, lambda val: psycopg2.extensions.Float(float(val)))
psycopg2.extensions.register_adapter(np.float32, lambda val: psycopg2.extensions.Float(float(val)))
psycopg2.extensions.register_adapter(np.int64, lambda val: psycopg2.extensions.AsIs(int(val)))
psycopg2.extensions.register_adapter(np.int32, lambda val: psycopg2.extensions.AsIs(int(val)))

logger = logging.getLogger("FeatureEngineer")


class FeatureEngineer:
    """
    Computes and persists derived features from measurement time-series.
    """

    def __init__(self, conn):
        self.conn = conn

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _get_or_create_feature_def(
        self,
        org_id: str,
        factory_id: str,
        name: str,
        display_name: str,
        formula_type: str,
        formula_definition: Dict[str, Any],
        output_unit: str,
        description: str = ""
    ) -> str:
        """Upsert feature_definition, return its id."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO feature_definitions (
                    organization_id, factory_id, name, display_name, description,
                    formula_type, formula_definition, output_unit, version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1)
                ON CONFLICT (factory_id, name, version) DO UPDATE
                SET display_name = EXCLUDED.display_name,
                    formula_definition = EXCLUDED.formula_definition
                RETURNING id;
                """,
                (org_id, factory_id, name, display_name, description,
                 formula_type, Json(formula_definition), output_unit)
            )
            self.conn.commit()
            return str(cur.fetchone()["id"])

    def _store_feature_value(
        self,
        feature_def_id: str,
        factory_id: str,
        period_start: datetime,
        period_end: datetime,
        value: float,
        unit: str,
        source_ids: List[str],
        computation_inputs: Dict[str, Any]
    ) -> str:
        """Insert one feature_value row."""
        def _to_py(obj):
            if isinstance(obj, (np.floating, float)):
                return float(obj)
            if isinstance(obj, (np.integer, int)):
                return int(obj)
            if isinstance(obj, dict):
                return {k: _to_py(v) for k, v in obj.items()}
            if isinstance(obj, (list, tuple)):
                return [_to_py(x) for x in obj]
            return obj

        clean_inputs = _to_py(computation_inputs)
        clean_value = float(round(float(value), 6))

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO feature_values (
                    feature_definition_id, factory_id,
                    period_start, period_end, value, unit,
                    source_measurement_ids, computation_inputs,
                    feature_definition_version
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::uuid[], %s, 1)
                RETURNING id;
                """,
                (
                    feature_def_id, factory_id,
                    period_start, period_end,
                    clean_value, unit,
                    [str(s) for s in source_ids],
                    Json(clean_inputs)
                )
            )
            self.conn.commit()
            return str(cur.fetchone()["id"])

    def _fetch_time_series(
        self,
        factory_id: str,
        metric_name: str,
        period_start: datetime,
        period_end: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch daily measurements for a metric, ordered by date."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT m.id, m.numeric_value, m.recorded_at, m.period_start, m.period_end
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
            return [dict(r) for r in cur.fetchall()]

    # ------------------------------------------------------------------
    # Feature Computations
    # ------------------------------------------------------------------
    def compute_ratio_feature(
        self,
        factory_id: str,
        org_id: str,
        numerator_metric: str,
        denominator_metric: str,
        feature_name: str,
        display_name: str,
        output_unit: str,
        period_start: datetime,
        period_end: datetime,
    ) -> List[Dict[str, Any]]:
        """
        Computes daily ratio: numerator / denominator.
        Example: coal_per_ton = Coal Consumption / Production
        """
        num_series = self._fetch_time_series(factory_id, numerator_metric, period_start, period_end)
        den_series = self._fetch_time_series(factory_id, denominator_metric, period_start, period_end)

        # Align by day
        den_by_day = {str(r["recorded_at"])[:10]: r for r in den_series}

        fd_id = self._get_or_create_feature_def(
            org_id, factory_id, feature_name, display_name,
            "ratio",
            {"numerator_metric": numerator_metric, "denominator_metric": denominator_metric},
            output_unit,
            f"Computed as {numerator_metric} / {denominator_metric}"
        )

        results = []
        for num_row in num_series:
            day_key = str(num_row["recorded_at"])[:10]
            den_row = den_by_day.get(day_key)
            if not den_row or float(den_row["numeric_value"]) == 0:
                continue

            num_val = float(num_row["numeric_value"])
            den_val = float(den_row["numeric_value"])
            ratio_val = num_val / den_val

            ps = num_row["period_start"] or num_row["recorded_at"]
            pe = num_row["period_end"] or num_row["recorded_at"]

            fv_id = self._store_feature_value(
                fd_id, factory_id, ps, pe, ratio_val, output_unit,
                [str(num_row["id"]), str(den_row["id"])],
                {
                    "numerator_metric": numerator_metric,
                    "numerator_value": num_val,
                    "denominator_metric": denominator_metric,
                    "denominator_value": den_val,
                    "result": ratio_val,
                    "formula": f"{num_val} / {den_val} = {ratio_val:.4f}"
                }
            )
            results.append({
                "day": day_key,
                "feature_name": feature_name,
                "value": round(ratio_val, 4),
                "unit": output_unit,
                "feature_value_id": fv_id
            })

        logger.info(f"Computed {len(results)} ratio feature values for '{feature_name}'")
        return results

    def compute_emission_intensity(
        self,
        factory_id: str,
        org_id: str,
        production_metric: str,
        period_start: datetime,
        period_end: datetime,
        emission_type: str = "CO2"
    ) -> List[Dict[str, Any]]:
        """
        Emission intensity = total daily CO2 / production output.
        e.g., kg_CO2 / tonne_steel
        """
        prod_series = self._fetch_time_series(factory_id, production_metric, period_start, period_end)
        prod_by_day = {str(r["recorded_at"])[:10]: r for r in prod_series}

        # Fetch daily total emissions per day
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DATE(er.period_start) as day,
                       SUM(er.emission_value) as daily_total,
                       ARRAY_AGG(er.measurement_id::text) as meas_ids
                FROM emission_records er
                JOIN emission_types et ON et.id = er.emission_type_id
                WHERE er.factory_id = %s
                  AND et.name = %s
                  AND er.period_start < %s
                  AND er.period_end > %s
                GROUP BY DATE(er.period_start)
                ORDER BY day;
                """,
                (factory_id, emission_type, period_end, period_start)
            )
            daily_emissions = {str(r["day"]): r for r in cur.fetchall()}

        fd_id = self._get_or_create_feature_def(
            org_id, factory_id,
            f"emission_intensity_{emission_type.lower()}",
            f"Emission Intensity ({emission_type}/unit of production)",
            "ratio",
            {"numerator": f"total_{emission_type}_emission_kg", "denominator": production_metric},
            "kg_CO2/tonne",
            f"kg {emission_type} per unit of {production_metric}"
        )

        results = []
        for day_key, prod_row in prod_by_day.items():
            em_row = daily_emissions.get(day_key)
            if not em_row:
                continue
            prod_val = float(prod_row["numeric_value"])
            if prod_val == 0:
                continue
            total_co2 = float(em_row["daily_total"])
            intensity = total_co2 / prod_val

            ps = prod_row["period_start"] or prod_row["recorded_at"]
            pe = prod_row["period_end"] or prod_row["recorded_at"]

            fv_id = self._store_feature_value(
                fd_id, factory_id, ps, pe, intensity, "kg_CO2/tonne",
                list(em_row["meas_ids"] or []) + [str(prod_row["id"])],
                {
                    "total_co2_kg": total_co2,
                    "production_value": prod_val,
                    "result": round(intensity, 4)
                }
            )
            results.append({
                "day": day_key,
                "feature_name": f"emission_intensity_{emission_type.lower()}",
                "value": round(intensity, 4),
                "unit": "kg_CO2/tonne",
                "feature_value_id": fv_id
            })

        logger.info(f"Computed {len(results)} emission intensity values")
        return results

    def compute_rolling_average(
        self,
        factory_id: str,
        org_id: str,
        metric_name: str,
        window: int,
        period_start: datetime,
        period_end: datetime
    ) -> List[Dict[str, Any]]:
        """Rolling mean over the last `window` observations."""
        series = self._fetch_time_series(factory_id, metric_name, period_start, period_end)
        if len(series) < window:
            return []

        fd_id = self._get_or_create_feature_def(
            org_id, factory_id,
            f"{metric_name.lower().replace(' ', '_')}_rolling_avg_{window}d",
            f"{metric_name} {window}-Day Rolling Average",
            "rolling_avg",
            {"metric": metric_name, "window": window, "stat": "avg"},
            series[0].get("numeric_value", "") and "same as metric",
            f"{window}-day rolling mean of {metric_name}"
        )

        values = [float(r["numeric_value"]) for r in series]
        results = []
        for i in range(window - 1, len(series)):
            window_vals = values[i - window + 1: i + 1]
            rolling_mean = np.mean(window_vals)
            row = series[i]
            ps = row["period_start"] or row["recorded_at"]
            pe = row["period_end"] or row["recorded_at"]
            fv_id = self._store_feature_value(
                fd_id, factory_id, ps, pe, rolling_mean, "same_as_source",
                [str(series[j]["id"]) for j in range(i - window + 1, i + 1)],
                {"window": window, "values": window_vals, "mean": rolling_mean}
            )
            results.append({
                "day": str(row["recorded_at"])[:10],
                "feature_name": f"{metric_name}_rolling_avg_{window}d",
                "value": round(rolling_mean, 4)
            })
        return results

    def compute_rate_of_change(
        self,
        factory_id: str,
        org_id: str,
        metric_name: str,
        period_start: datetime,
        period_end: datetime
    ) -> List[Dict[str, Any]]:
        """Day-over-day percentage change."""
        series = self._fetch_time_series(factory_id, metric_name, period_start, period_end)
        if len(series) < 2:
            return []

        fd_id = self._get_or_create_feature_def(
            org_id, factory_id,
            f"{metric_name.lower().replace(' ', '_')}_rate_of_change",
            f"{metric_name} Daily Rate of Change",
            "rate_of_change",
            {"metric": metric_name},
            "%",
            f"Day-over-day % change in {metric_name}"
        )

        results = []
        for i in range(1, len(series)):
            prev_val = float(series[i - 1]["numeric_value"])
            curr_val = float(series[i]["numeric_value"])
            if prev_val == 0:
                continue
            roc = ((curr_val - prev_val) / prev_val) * 100
            row = series[i]
            ps = row["period_start"] or row["recorded_at"]
            pe = row["period_end"] or row["recorded_at"]
            fv_id = self._store_feature_value(
                fd_id, factory_id, ps, pe, roc, "%",
                [str(series[i - 1]["id"]), str(series[i]["id"])],
                {"prev": prev_val, "curr": curr_val, "pct_change": roc}
            )
            results.append({
                "day": str(row["recorded_at"])[:10],
                "feature_name": f"{metric_name}_rate_of_change",
                "value": round(roc, 4)
            })
        return results

    def compute_statistic_feature(
        self,
        factory_id: str,
        org_id: str,
        metric_name: str,
        statistic: str,
        period_start: datetime,
        period_end: datetime
    ) -> Optional[Dict[str, Any]]:
        """Store one traceable descriptive statistic for a metric and period."""
        supported = {"mean", "median", "min", "max", "std_dev"}
        if statistic not in supported:
            raise ValueError(f"Unsupported statistic '{statistic}'. Use one of {sorted(supported)}")
        series = self._fetch_time_series(factory_id, metric_name, period_start, period_end)
        if not series:
            return None
        values = np.array([float(row["numeric_value"]) for row in series], dtype=float)
        value = float({
            "mean": np.mean,
            "median": np.median,
            "min": np.min,
            "max": np.max,
            "std_dev": np.std,
        }[statistic](values))
        feature_name = f"{metric_name.lower().replace(' ', '_')}_{statistic}"
        fd_id = self._get_or_create_feature_def(
            org_id, factory_id, feature_name,
            f"{metric_name} {statistic.replace('_', ' ').title()}",
            "std_dev" if statistic == "std_dev" else "custom",
            {"metric": metric_name, "statistic": statistic}, "same_as_source",
            f"{statistic} of {metric_name} over the analysis period"
        )
        self._store_feature_value(
            fd_id, factory_id, period_start, period_end, value, "same_as_source",
            [str(row["id"]) for row in series],
            {"metric": metric_name, "statistic": statistic, "values": values.tolist(), "result": value}
        )
        return {"feature_name": feature_name, "value": round(value, 6), "unit": "same_as_source"}

    # ------------------------------------------------------------------
    # Convenience: run all steel demo features at once
    # ------------------------------------------------------------------
    def engineer_steel_demo_features(
        self,
        factory_id: str,
        org_id: str,
        period_start: datetime,
        period_end: datetime
    ) -> Dict[str, Any]:
        """
        Computes the full feature set for ABC Steel demo:
          1. coal_per_ton        = Coal Consumption / Production
          2. emission_intensity  = Total CO2 / Production
          3. furnace_efficiency_roc = rate of change in Furnace Efficiency
          4. coal_consumption_rolling_avg_3d
        """
        output = {}

        logger.info("Engineering feature: coal_per_ton (ratio)")
        output["coal_per_ton"] = self.compute_ratio_feature(
            factory_id, org_id,
            numerator_metric="Coal Consumption",
            denominator_metric="Production",
            feature_name="coal_per_ton",
            display_name="Coal Consumption per Tonne of Steel",
            output_unit="kg_coal/tonne_steel",
            period_start=period_start,
            period_end=period_end
        )

        logger.info("Engineering feature: emission_intensity_co2")
        output["emission_intensity"] = self.compute_emission_intensity(
            factory_id, org_id,
            production_metric="Production",
            period_start=period_start,
            period_end=period_end
        )

        logger.info("Engineering feature: furnace_efficiency_rate_of_change")
        output["furnace_efficiency_roc"] = self.compute_rate_of_change(
            factory_id, org_id,
            metric_name="Furnace Efficiency",
            period_start=period_start,
            period_end=period_end
        )

        logger.info("Engineering feature: coal_rolling_avg_3d")
        output["coal_rolling_avg"] = self.compute_rolling_average(
            factory_id, org_id,
            metric_name="Coal Consumption",
            window=3,
            period_start=period_start,
            period_end=period_end
        )

        return output

    def engineer_features(
        self,
        factory_id: str,
        org_id: str,
        available_metrics: List[str],
        period_start: datetime,
        period_end: datetime,
        emission_type: str = "CO2"
    ) -> Dict[str, Any]:
        """Build features from metric capabilities; steel is only one configuration."""
        metrics = {metric.lower(): metric for metric in available_metrics}
        output: Dict[str, Any] = {}
        coal = metrics.get("coal consumption")
        production = metrics.get("production")
        efficiency = metrics.get("furnace efficiency")

        if coal and production:
            output["coal_per_ton"] = self.compute_ratio_feature(
                factory_id, org_id, coal, production, "coal_per_ton",
                "Coal Consumption per Tonne of Production", "kg_coal/tonne",
                period_start, period_end
            )
            output["coal_statistics"] = {
                stat: self.compute_statistic_feature(
                    factory_id, org_id, coal, stat, period_start, period_end
                )
                for stat in ("mean", "median", "min", "max", "std_dev")
            }

        if production:
            output["emission_intensity"] = self.compute_emission_intensity(
                factory_id, org_id, production, period_start, period_end, emission_type
            )
        if efficiency:
            output["furnace_efficiency_roc"] = self.compute_rate_of_change(
                factory_id, org_id, efficiency, period_start, period_end
            )
        if coal:
            output["coal_rolling_avg"] = self.compute_rolling_average(
                factory_id, org_id, coal, 3, period_start, period_end
            )
        return output

    def get_feature_matrix(
        self,
        factory_id: str,
        period_start: datetime,
        period_end: datetime,
        emission_type: str = "CO2"
    ) -> List[Dict[str, Any]]:
        """
        Returns a wide table of raw + derived features per day,
        aligned by date. Used as ML input matrix.
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DATE(m.recorded_at) as day,
                       md.name as metric_name,
                       m.numeric_value
                FROM measurements m
                JOIN metric_definitions md ON md.id = m.metric_definition_id
                WHERE m.factory_id = %s
                  AND m.recorded_at >= %s
                  AND m.recorded_at <= %s
                  AND m.quality_status = 'VALIDATED'
                  AND m.numeric_value IS NOT NULL
                ORDER BY day, md.name;
                """,
                (factory_id, period_start, period_end)
            )
            rows = cur.fetchall()

        # Pivot to wide format
        from collections import defaultdict
        daily: Dict[str, Dict[str, float]] = defaultdict(dict)
        for row in rows:
            daily[str(row["day"])][row["metric_name"]] = float(row["numeric_value"])

        # Add feature values
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DATE(fv.period_start) as day,
                       fd.name as feature_name,
                       fv.value
                FROM feature_values fv
                JOIN feature_definitions fd ON fd.id = fv.feature_definition_id
                WHERE fv.factory_id = %s
                  AND fv.period_start < %s
                  AND fv.period_end > %s
                  AND fv.value IS NOT NULL
                ORDER BY day, fd.name;
                """,
                (factory_id, period_end, period_start)
            )
            for row in cur.fetchall():
                daily[str(row["day"])][f"feat_{row['feature_name']}"] = float(row["value"])

        # Add daily total emissions as target
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DATE(er.period_start) as day, SUM(er.emission_value) as total_co2
                FROM emission_records er
                JOIN emission_types et ON et.id = er.emission_type_id
                WHERE er.factory_id = %s AND et.name = %s
                  AND er.period_start < %s AND er.period_end > %s
                GROUP BY DATE(er.period_start)
                ORDER BY day;
                """,
                (factory_id, emission_type, period_end, period_start)
            )
            for row in cur.fetchall():
                daily[str(row["day"])]["target_total_co2_kg"] = float(row["total_co2"])

        return [{"day": day, **features} for day, features in sorted(daily.items())]
