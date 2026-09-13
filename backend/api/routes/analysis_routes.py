"""
Analysis API Routes
Part 10 — POST /api/v1/factories/{factory_id}/analyze
"""

import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, Body, UploadFile, File, Form, Request
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

from api.routes.auth_routes import authorize_factory_access, require_factory_manager

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

router = APIRouter(prefix="/api/v1", tags=["Analysis Engine"])


def get_conn():
    return psycopg2.connect(DATABASE_URL)


class AnalysisRequest(BaseModel):
    period_start: str = Field(..., example="2026-09-01T00:00:00Z")
    period_end: str = Field(..., example="2026-09-10T23:59:59Z")
    emission_type: str = Field("CO2", example="CO2")
    mcda_weights: Optional[Dict[str, float]] = Field(
        None,
        example={
            "emission_reduction": 0.50,
            "cost_effectiveness": 0.20,
            "feasibility": 0.20,
            "compatibility": 0.10
        }
    )


@router.post("/factories/{factory_id}/analyze")
def run_analysis(factory_id: str, payload: AnalysisRequest, request: Request):
    """
    Executes the full 10-stage analysis pipeline for a factory:

    1. Factory metadata
    2. Bootstrap emission sources/factors
    3. Emission calculation (Activity × EF)
    4. Source contribution analysis
    5. Feature engineering
    6. ML attribution (RF + SHAP)
    7. Root-cause interpretation
    8. Applicable alternatives
    9. Impact calculation
    10. MCDA ranking + Recommendation
    """
    authorize_factory_access(request, factory_id, "model:predict")
    from analysis.pipeline import AnalysisPipeline
    try:
        period_start = datetime.fromisoformat(payload.period_start.replace("Z", "+00:00"))
        period_end = datetime.fromisoformat(payload.period_end.replace("Z", "+00:00"))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Invalid date format: {e}")

    try:
        conn = get_conn()
        pipeline = AnalysisPipeline(conn)
        result = pipeline.run(
            factory_id=factory_id,
            period_start=period_start,
            period_end=period_end,
            emission_type=payload.emission_type,
            mcda_weights=payload.mcda_weights
        )
        conn.close()
        return {"status": "success", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"{str(e)}\n{traceback.format_exc()}")


@router.get("/factories/{factory_id}/recommendations")
def get_recommendations(factory_id: str, request: Request, limit: int = Query(5, ge=1, le=50)):
    """Retrieve latest recommendations for a factory."""
    authorize_factory_access(request, factory_id, "recommendation:view")
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT r.id, r.analysis_period_start, r.analysis_period_end,
                       r.created_at, es.name as hotspot_source,
                       COUNT(ra.id) as alternatives_count
                FROM recommendations r
                JOIN emission_sources es ON es.id = r.emission_source_id
                LEFT JOIN recommendation_alternatives ra ON ra.recommendation_id = r.id
                WHERE r.factory_id = %s
                GROUP BY r.id, r.analysis_period_start, r.analysis_period_end,
                         r.created_at, es.name
                ORDER BY r.created_at DESC
                LIMIT %s;
                """,
                (factory_id, limit)
            )
            rows = [dict(r) for r in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/factories/{factory_id}/recommendations/{rec_id}")
def get_recommendation_detail(factory_id: str, rec_id: str):
    """Get full ranked alternatives for a specific recommendation."""
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT ra.rank, ra.mcda_score, ra.estimated_reduction_pct,
                       ra.estimated_reduction_kg, ra.estimated_capex,
                       ra.feasibility_score, ra.is_top_recommendation,
                       ra.reasoning, ra.scoring_breakdown,
                       a.name as alternative_name, a.category, a.description
                FROM recommendation_alternatives ra
                JOIN alternatives a ON a.id = ra.alternative_id
                WHERE ra.recommendation_id = %s
                ORDER BY ra.rank;
                """,
                (rec_id,)
            )
            rows = [dict(r) for r in cur.fetchall()]
        if not rows:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        return {"status": "success", "recommendation_id": rec_id, "data": rows}
    finally:
        conn.close()


@router.get("/factories/{factory_id}/contribution")
def get_contribution_analysis(factory_id: str, request: Request):
    """Get the latest emission source contribution breakdown."""
    authorize_factory_access(request, factory_id, "measurement:view")
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT ca.*, et.name as emission_type_name, es.name as hotspot_source_name
                FROM contribution_analyses ca
                JOIN emission_types et ON et.id = ca.emission_type_id
                LEFT JOIN emission_sources es ON es.id = ca.primary_hotspot_source_id
                WHERE ca.factory_id = %s
                ORDER BY ca.created_at DESC LIMIT 1;
                """,
                (factory_id,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="No contribution analysis found. Run /analyze first.")
            return {"status": "success", "data": dict(row)}
    finally:
        conn.close()


@router.get("/factories/{factory_id}/emissions")
def get_emission_records(factory_id: str, request: Request, limit: int = Query(1000, ge=1, le=5000)):
    """Retrieve calculated emission records stored for a factory."""
    authorize_factory_access(request, factory_id, "measurement:view")
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT er.id, er.factory_id, er.measurement_id,
                       er.period_start, er.period_end, er.activity_value,
                       er.activity_unit, er.emission_value, er.emission_unit,
                       er.calculation_method, er.is_estimated,
                       es.name AS source_name, es.source_category,
                       et.name AS emission_type_name,
                       md.name AS metric_name
                FROM emission_records er
                JOIN emission_sources es ON es.id = er.emission_source_id
                JOIN emission_types et ON et.id = er.emission_type_id
                LEFT JOIN measurements m ON m.id = er.measurement_id
                LEFT JOIN metric_definitions md ON md.id = m.metric_definition_id
                WHERE er.factory_id = %s
                ORDER BY er.period_start DESC
                LIMIT %s;
                """,
                (factory_id, limit)
            )
            rows = [dict(row) for row in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/factories/{factory_id}/features")
def get_feature_values(
    factory_id: str,
    request: Request,
    feature_name: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500)
):
    """Retrieve computed feature values."""
    authorize_factory_access(request, factory_id, "measurement:view")
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT fv.period_start, fv.period_end, fv.value, fv.unit,
                       fv.computation_inputs, fd.name as feature_name, fd.display_name
                FROM feature_values fv
                JOIN feature_definitions fd ON fd.id = fv.feature_definition_id
                WHERE fv.factory_id = %s
            """
            params: list = [factory_id]
            if feature_name:
                query += " AND LOWER(fd.name) = LOWER(%s)"
                params.append(feature_name)
            query += " ORDER BY fv.period_start ASC LIMIT %s;"
            params.append(limit)
            cur.execute(query, params)
            rows = [dict(r) for r in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/factories/{factory_id}/ml-attribution")
def get_ml_attribution(factory_id: str, request: Request):
    """Get the latest ML feature attribution (SHAP-based) results."""
    authorize_factory_access(request, factory_id, "model:view_drivers")
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT fc.rank, fc.importance_score, fc.direction,
                       fd.name as feature_name, fd.display_name,
                       mr.name as model_name, mr.training_metrics,
                       fc.analysis_period_start, fc.analysis_period_end
                FROM factor_contributions fc
                JOIN feature_definitions fd ON fd.id = fc.feature_definition_id
                JOIN model_registry mr ON mr.id = fc.model_run_id
                WHERE fc.factory_id = %s
                ORDER BY fc.analysis_period_start DESC, fc.rank ASC
                LIMIT 20;
                """,
                (factory_id,)
            )
            rows = [dict(r) for r in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/alternatives")
def list_alternatives(industry_type: Optional[str] = Query(None)):
    """List all alternatives in the knowledge base."""
    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if industry_type:
                cur.execute(
                    """
                    SELECT a.id, a.name, a.category, a.summary, a.reference_source,
                           ai.reduction_typical_pct, ai.feasibility_score,
                           ai.capex_range_low, ai.capex_range_high
                    FROM alternatives a
                    JOIN alternative_applicability aa ON aa.alternative_id = a.id
                    JOIN alternative_impacts ai ON ai.alternative_id = a.id
                    WHERE a.is_active=TRUE AND %s = ANY(aa.industry_types)
                    ORDER BY ai.reduction_typical_pct DESC;
                    """,
                    (industry_type,)
                )
            else:
                cur.execute(
                    """
                    SELECT a.id, a.name, a.category, a.summary, a.reference_source,
                           ai.reduction_typical_pct, ai.feasibility_score
                    FROM alternatives a
                    JOIN alternative_impacts ai ON ai.alternative_id = a.id
                    WHERE a.is_active=TRUE ORDER BY a.category, a.name;
                    """
                )
            rows = [dict(r) for r in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.post("/factories/create-with-csv")
async def create_factory_with_csv(
    request: Request,
    factory_name: str = Form(...),
    industry_type: str = Form("Manufacturing"),
    file: UploadFile = File(...),
    run_pipeline: bool = Query(True, description="Whether to run 10-stage AI analysis immediately"),
):
    """
    Create a brand-new factory (named by the caller) and ingest a CSV into it
    in one step. SME Owner and Factory Operator accounts are capped at one
    factory each — this returns 409 with the existing factory's details if
    the caller already has one, so the frontend can offer a
    delete-then-add-new flow instead of silently failing.
    """
    access = require_factory_manager(request)
    role = access["role"]
    organization_id = access["organization_id"]
    if not organization_id:
        raise HTTPException(status_code=400, detail="No organization is associated with this account yet.")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    factory_name = factory_name.strip()
    if not factory_name:
        raise HTTPException(status_code=400, detail="Factory name is required.")

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT name, slug FROM organizations WHERE id = %s;", (organization_id,))
            org = cur.fetchone()
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found.")

            if role == "SME_OWNER":
                cur.execute(
                    "SELECT id, name FROM factories WHERE organization_id = %s AND is_active = TRUE;",
                    (organization_id,),
                )
                existing = cur.fetchall()
                if existing:
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "message": "SME / Factory Owner accounts are limited to one factory. Delete the existing factory before adding a new one.",
                            "existing_factories": [dict(e) for e in existing],
                        },
                    )
            elif role == "FACTORY_OPERATOR" and access["assigned_factory_id"]:
                cur.execute("SELECT id, name FROM factories WHERE id = %s;", (access["assigned_factory_id"],))
                existing = cur.fetchone()
                if existing:
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "message": "Factory Operator accounts are limited to one assigned factory. Delete it before adding a new one.",
                            "existing_factories": [dict(existing)],
                        },
                    )
    finally:
        conn.close()

    slug_base = re.sub(r"[^a-z0-9]+", "-", factory_name.lower()).strip("-") or "factory"
    factory_code = f"{slug_base}-{uuid.uuid4().hex[:6]}"

    import tempfile
    import shutil
    from ingest_custom_csv import ingest_and_analyze_csv

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = ingest_and_analyze_csv(
            csv_path=tmp_path,
            factory_name=factory_name,
            factory_code=factory_code,
            industry_type=industry_type or "Manufacturing",
            org_name=org["name"],
            org_slug=org["slug"],
            run_analysis=run_pipeline,
        )
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}\n{traceback.format_exc()}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # A Factory Operator becomes assigned to the factory they just created.
    if role == "FACTORY_OPERATOR":
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE user_organization_roles SET factory_id = %s
                    WHERE user_id = %s AND organization_id = %s;
                    """,
                    (result["factory_id"], access["user"].id, organization_id),
                )
            conn.commit()
        finally:
            conn.close()

    return {"status": "success", "data": result}


@router.post("/factories/{factory_id}/upload-csv")
async def upload_custom_csv(
    factory_id: str,
    request: Request,
    file: UploadFile = File(...),
    run_pipeline: bool = Query(True, description="Whether to run 10-stage AI analysis immediately"),
):
    """
    Upload a custom CSV file to ingest measurements for a factory and run the 10-stage AI analysis.
    Supports either:
      - WIDE format: date, Production, Coal Consumption, Electricity, ...
      - LONG format: date, metric, value
    """
    authorize_factory_access(request, factory_id, "measurement:write")
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    import tempfile
    import shutil
    from ingest_custom_csv import ingest_and_analyze_csv

    conn = get_conn()
    try:
        from psycopg2.extras import RealDictCursor
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT f.id, f.name, f.code, f.industry_type, o.name as org_name, o.slug as org_slug "
                "FROM factories f JOIN organizations o ON o.id = f.organization_id WHERE f.id = %s OR f.code = %s;",
                (factory_id, factory_id)
            )
            factory = cur.fetchone()
            if not factory:
                raise HTTPException(status_code=404, detail="Factory not found")
    finally:
        conn.close()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        result = ingest_and_analyze_csv(
            csv_path=tmp_path,
            factory_name=factory["name"],
            factory_code=factory["code"],
            industry_type=factory["industry_type"],
            org_name=factory["org_name"],
            org_slug=factory["org_slug"],
            run_analysis=run_pipeline,
        )
        return {"status": "success", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}\n{traceback.format_exc()}")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
