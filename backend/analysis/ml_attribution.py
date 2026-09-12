"""
PART 4 — ML / STATISTICAL ATTRIBUTION ENGINE
=============================================
Uses Random Forest regression + SHAP values to identify which
operational features are statistically associated with high emissions.

⚠️  IMPORTANT DISTINCTION:
    SOURCE CONTRIBUTION  ≠  FEATURE IMPORTANCE
    ─────────────────────────────────────────────
    • Source Contribution (Part 2): answers "Which physical emission
      SOURCE contributes the most?" — purely deterministic math.

    • Feature Importance (this module): answers "Which OPERATIONAL
      VARIABLES explain the model's emission predictions?" — statistical.

⚠️  DATA SIZE WARNING:
    The 10-row demo dataset is insufficient for a reliable production ML model.
    Results shown here are for PIPELINE DEMONSTRATION ONLY.
    A production deployment requires months of operational data.

Model: RandomForestRegressor (explainable, handles non-linear interactions)
Explainability: SHAP TreeExplainer (TreeSHAP — exact SHAP values)
"""

import logging
import json
import warnings
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import psycopg2.extensions
from psycopg2.extras import RealDictCursor, Json

# Register numpy adapters for psycopg2
psycopg2.extensions.register_adapter(np.float64, lambda val: psycopg2.extensions.Float(float(val)))
psycopg2.extensions.register_adapter(np.float32, lambda val: psycopg2.extensions.Float(float(val)))
psycopg2.extensions.register_adapter(np.int64, lambda val: psycopg2.extensions.AsIs(int(val)))
psycopg2.extensions.register_adapter(np.int32, lambda val: psycopg2.extensions.AsIs(int(val)))

warnings.filterwarnings("ignore")
logger = logging.getLogger("MLAttribution")


class MLAttributionEngine:
    """
    Trains a Random Forest regressor on the feature matrix,
    computes SHAP feature importances, and stores results in:
      - model_registry
      - model_evaluations
      - factor_contributions
    """

    def __init__(self, conn):
        self.conn = conn

    def _get_or_create_feature_defs_for_model(
        self,
        factory_id: str,
        feature_names: List[str]
    ) -> Dict[str, str]:
        """Map feature column names → feature_definition UUIDs (or create stubs)."""
        org_id = self._get_org_id(factory_id)
        fd_ids: Dict[str, str] = {}

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            for fname in feature_names:
                cur.execute(
                    """
                    INSERT INTO feature_definitions (
                        organization_id, factory_id, name, display_name,
                        formula_type, formula_definition, output_unit, version
                    )
                    VALUES (%s, %s, %s, %s, 'custom', '{}', 'various', 1)
                    ON CONFLICT (factory_id, name, version) DO UPDATE
                    SET display_name = EXCLUDED.display_name
                    RETURNING id;
                    """,
                    (org_id, factory_id, fname, fname.replace("_", " ").title())
                )
                fd_ids[fname] = str(cur.fetchone()["id"])
            self.conn.commit()

        return fd_ids

    def _get_org_id(self, factory_id: str) -> str:
        with self.conn.cursor() as cur:
            cur.execute("SELECT organization_id FROM factories WHERE id=%s;", (factory_id,))
            return str(cur.fetchone()[0])

    def _get_co2_type_id(self) -> str:
        with self.conn.cursor() as cur:
            cur.execute("SELECT id FROM emission_types WHERE name='CO2';")
            return str(cur.fetchone()[0])

    def _get_primary_source_id(self, factory_id: str) -> Optional[str]:
        with self.conn.cursor() as cur:
            cur.execute(
                """
                SELECT primary_hotspot_source_id FROM contribution_analyses
                WHERE factory_id=%s ORDER BY created_at DESC LIMIT 1;
                """,
                (factory_id,)
            )
            row = cur.fetchone()
            return str(row[0]) if row and row[0] else None

    def run_attribution(
        self,
        factory_id: str,
        feature_matrix: List[Dict[str, Any]],
        period_start: datetime,
        period_end: datetime,
        target_col: str = "target_total_co2_kg"
    ) -> Dict[str, Any]:
        """
        Full ML attribution pipeline:
        1. Build feature matrix from provided rows
        2. Train RandomForest
        3. Compute SHAP values
        4. Store model + factor_contributions
        5. Return explainable attribution report
        """
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.metrics import r2_score, mean_absolute_error
        import shap

        # ── Build DataFrame ──────────────────────────────────────────────
        df = pd.DataFrame(feature_matrix).set_index("day")

        # Drop target and non-numeric columns
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in feature matrix")

        df = df.dropna(subset=[target_col])
        if len(df) < 5:
            raise ValueError(f"Fewer than 5 samples available for target {target_col}")

        y = df[target_col].astype(float).values
        feature_cols = [
            c for c in df.columns
            if c != target_col and df[c].dtype in [np.float64, np.int64, float, int]
        ]
        X = df[feature_cols].fillna(0).values

        n_samples = len(X)
        logger.info(f"Training ML model on {n_samples} samples × {len(feature_cols)} features")

        # ── Train ────────────────────────────────────────────────────────
        rf = RandomForestRegressor(
            n_estimators=50,
            max_depth=3,
            random_state=42,
            n_jobs=-1
        )
        rf.fit(X, y)
        y_pred = rf.predict(X)
        r2 = r2_score(y, y_pred) if n_samples >= 2 else float("nan")
        mae = mean_absolute_error(y, y_pred) if n_samples >= 2 else float("nan")

        # ── SHAP Values ──────────────────────────────────────────────────
        explainer = shap.TreeExplainer(rf)
        shap_values = explainer.shap_values(X)
        # Mean absolute SHAP → overall importance
        mean_abs_shap = np.abs(shap_values).mean(axis=0)
        total_shap = mean_abs_shap.sum()
        normalized_shap = mean_abs_shap / total_shap if total_shap > 0 else mean_abs_shap

        # Pair with feature names, rank
        shap_ranking = sorted(
            zip(feature_cols, normalized_shap, mean_abs_shap),
            key=lambda x: x[1],
            reverse=True
        )

        # ── Persist: model_registry ──────────────────────────────────────
        primary_source_id = self._get_primary_source_id(factory_id)
        co2_type_id = self._get_co2_type_id()
        fd_map = self._get_or_create_feature_defs_for_model(factory_id, feature_cols)

        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            import pickle, base64
            model_bytes = base64.b64encode(pickle.dumps(rf)).decode()[:200] + "..."
            cur.execute(
                """
                INSERT INTO model_registry (
                    factory_id, emission_source_id, name, model_type,
                    target_variable, version, artifact_location,
                    training_period_start, training_period_end,
                    training_metrics, hyperparameters, feature_list
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::uuid[])
                ON CONFLICT (factory_id, name, version) DO UPDATE
                SET training_period_start = EXCLUDED.training_period_start,
                    training_period_end = EXCLUDED.training_period_end,
                    training_metrics = EXCLUDED.training_metrics,
                    hyperparameters = EXCLUDED.hyperparameters,
                    feature_list = EXCLUDED.feature_list,
                    trained_at = NOW()
                RETURNING id;
                """,
                (
                    factory_id, primary_source_id,
                    "steel_emission_attribution_rf",
                    "random_forest",
                    target_col, "1.0",
                    f"in-memory:demo:{factory_id}",
                    period_start, period_end,
                    Json({
                        "r2": round(float(r2), 4) if not np.isnan(r2) else None,
                        "mae_kg": round(float(mae), 2) if not np.isnan(mae) else None,
                        "n_samples": n_samples,
                        "warning": (
                            "DEMO ONLY — 10 samples insufficient for production ML"
                            if n_samples < 30 else "OK"
                        )
                    }),
                    Json({"n_estimators": 50, "max_depth": 3}),
                    [fd_map[f] for f in feature_cols]
                )
            )
            model_id = str(cur.fetchone()["id"])

            # model_evaluations
            cur.execute(
                """
                INSERT INTO model_evaluations (model_id, evaluation_period_start,
                    evaluation_period_end, metrics, notes)
                VALUES (%s, %s, %s, %s, %s) RETURNING id;
                """,
                (
                    model_id, period_start, period_end,
                    Json({"r2": round(float(r2), 4) if not np.isnan(r2) else None,
                          "mae_kg": round(float(mae), 2) if not np.isnan(mae) else None}),
                    "Demonstration — 10-sample dataset, not production-grade"
                )
            )

            # factor_contributions
            for rank_i, (fname, norm_shap, abs_shap) in enumerate(shap_ranking, start=1):
                fd_id = fd_map.get(fname)
                if not fd_id or not primary_source_id:
                    continue
                # Determine direction from mean raw SHAP sign
                col_idx = feature_cols.index(fname)
                mean_signed_shap = shap_values[:, col_idx].mean()
                direction = "positive" if mean_signed_shap > 0 else (
                    "negative" if mean_signed_shap < 0 else "neutral"
                )
                cur.execute(
                    """
                    INSERT INTO factor_contributions (
                        factory_id, emission_source_id, emission_type_id,
                        model_run_id, feature_definition_id,
                        analysis_period_start, analysis_period_end,
                        importance_score, importance_method, direction, rank
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT DO NOTHING;
                    """,
                    (
                        factory_id, primary_source_id, co2_type_id,
                        model_id, fd_id,
                        period_start, period_end,
                        round(float(norm_shap), 6), "SHAP",
                        direction, rank_i
                    )
                )

            self.conn.commit()

        # ── Build Attribution Report ─────────────────────────────────────
        attribution = []
        for rank_i, (fname, norm_shap, abs_shap) in enumerate(shap_ranking, start=1):
            col_idx = feature_cols.index(fname)
            mean_signed_shap = shap_values[:, col_idx].mean()
            attribution.append({
                "rank": rank_i,
                "feature": fname,
                "shap_importance_pct": round(float(norm_shap) * 100, 2),
                "mean_abs_shap": round(float(abs_shap), 2),
                "direction": "positive" if mean_signed_shap > 0 else (
                    "negative" if mean_signed_shap < 0 else "neutral"
                ),
                "interpretation": (
                    f"Higher {fname} is associated with HIGHER emissions"
                    if mean_signed_shap > 0
                    else f"Higher {fname} is associated with LOWER emissions"
                )
            })

        return {
            "model_id": model_id,
            "model_type": "RandomForestRegressor + SHAP TreeExplainer",
            "n_samples": n_samples,
            "features_used": feature_cols,
            "target": target_col,
            "training_metrics": {
                "r2": round(float(r2), 4) if not np.isnan(r2) else None,
                "mae_kg_co2": round(float(mae), 2) if not np.isnan(mae) else None,
            },
            "data_size_warning": (
                "⚠️  DEMONSTRATION ONLY — 10 samples are insufficient for a reliable "
                "production ML model. Results shown are for pipeline illustration."
                if n_samples < 30 else "OK"
            ),
            "important_distinction": (
                "Feature importance answers 'Which OPERATIONAL VARIABLES explain the model?' "
                "— this is SEPARATE from Source Contribution (Part 2), which answers "
                "'Which physical EMISSION SOURCE contributes the most?'"
            ),
            "attribution": attribution,
            "primary_driver": attribution[0] if attribution else None,
        }
