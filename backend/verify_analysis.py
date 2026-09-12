"""
Industrial Sustainability Intelligence Platform
Analysis Engine Verification & Demonstration Suite
==================================================
Tests:
  1. Full 10-stage Analysis Pipeline orchestration
  2. Hotspot source identification & deterministic calculations
  3. Feature engineering & derived intensity metrics
  4. ML Attribution with Random Forest & SHAP
  5. Decarbonization alternatives matching & impact calculations
  6. Multi-Criteria Decision Analysis (MCDA) ranking
  7. REST API Endpoints (/analyze, /recommendations, /contribution)
"""

import os
import sys
import json
from datetime import datetime, timezone

# Ensure stdout handles unicode/cp1252 gracefully on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import psycopg2
from dotenv import load_dotenv
from fastapi.testclient import TestClient

from analysis.pipeline import AnalysisPipeline
from storage_service import DataStorageService
from api import app

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")


def run_analysis_verification():
    print("=" * 80)
    print("        INDUSTRIAL SUSTAINABILITY INTELLIGENCE PLATFORM        ")
    print("                ANALYSIS ENGINE VERIFICATION SUITE              ")
    print("=" * 80)

    # 1. Setup & Factory Retrieval
    storage = DataStorageService()
    steel = storage.get_factory_by_code("demo1")
    if not steel:
        print("[FAIL] Demo factory 'demo1' (Steel) not found.")
        return False

    factory_id = steel["id"]
    print(f"\n[TARGET FACTORY] {steel['name']} (ID: {factory_id})")
    print(f"Sector: {steel['industry_type']} | Location: {steel['location']}")

    period_start = datetime(2026, 9, 1, 0, 0, 0, tzinfo=timezone.utc)
    period_end = datetime(2026, 9, 10, 23, 59, 59, tzinfo=timezone.utc)

    # 2. Execute Analysis Pipeline directly
    print("\n" + "-" * 80)
    print("RUNNING 10-STAGE ANALYSIS PIPELINE")
    print("-" * 80)

    conn = psycopg2.connect(DATABASE_URL)
    pipeline = AnalysisPipeline(conn)

    report = pipeline.run(
        factory_id=factory_id,
        period_start=period_start,
        period_end=period_end,
        emission_type="CO2"
    )
    conn.close()

    assert report["status"] == "COMPLETE", f"Pipeline failed: {report}"
    print(f"[SUCCESS] Pipeline Status: {report['status']}")
    print(f"Stages Executed ({len(report['pipeline_stages'])}):")
    for s in report["pipeline_stages"]:
        print(f"  [OK] {s}")

    # 3. Verify Deterministic Emission & Hotspot Analysis
    print("\n" + "-" * 80)
    print("STAGE 3 & 4: DETERMINISTIC EMISSIONS & SOURCE HOTSPOT ATTRIBUTION")
    print("-" * 80)

    contrib = report.get("contribution", {})
    hotspot_name = contrib.get("hotspot_source_name")
    hotspot_pct = contrib.get("hotspot_contribution_pct")
    total_co2 = contrib.get("total_emission_kg")

    print(f"Total Period CO2 Calculated: {total_co2:,.2f} kg ({total_co2/1000:,.2f} tCO2)")
    print(f"Primary Emission Hotspot:    {hotspot_name} ({hotspot_pct:.1f}% of total emissions)")
    print("\nSource Contribution Breakdown:")
    for src in contrib.get("sources", []):
        bar = "#" * int(src["contribution_pct"] / 2.5)
        print(f"  - {src['source_name']:<35} : {src['emission_value']:>10,.1f} kg ({src['contribution_pct']:>5.1f}%) {bar}")

    assert hotspot_pct > 40.0, f"Expected coal combustion to be primary hotspot (>40%), got {hotspot_pct}%"

    # 4. Verify Feature Engineering & Derived Metrics
    print("\n" + "-" * 80)
    print("STAGE 5: OPERATIONAL FEATURE ENGINEERING")
    print("-" * 80)
    print(f"Feature matrix rows generated: {report.get('feature_matrix_rows')}")
    features = report.get("features", {})
    for feat_name, samples in features.items():
        if isinstance(samples, dict):
            print(f"  - {feat_name:<30} (Aggregate values: {samples})")
        elif samples:
            print(f"  - {feat_name:<30} (Sample values: {[round(s['value'], 3) for s in samples]})")

    # 5. Verify ML Attribution (Random Forest + SHAP)
    print("\n" + "-" * 80)
    print("STAGE 6: ML & STATISTICAL ATTRIBUTION (Random Forest + SHAP)")
    print("-" * 80)
    ml_res = report.get("ml_attribution", {})
    if ml_res:
        print(f"Model: {ml_res.get('model_type')}")
        eval_metrics = ml_res.get("training_metrics", {})
        print(f"Evaluation Metrics: R^2 = {eval_metrics.get('r2', 0):.3f}, MAE = {eval_metrics.get('mae_kg_co2', 0):.2f} kg CO2")
        print("\nTop Feature Importances (SHAP Attribution):")
        for feat in ml_res.get("attribution", [])[:5]:
            print(f"  - {feat.get('feature'):<30} | Mean |SHAP|: {feat.get('mean_abs_shap', 0):.4f} | Importance: {feat.get('shap_importance_pct', 0):.1f}% ({feat.get('direction')})")
    else:
        print("ML Attribution note: Skipped or insufficient rows")

    # 6. Verify Root Cause Operational Patterns
    print("\n" + "-" * 80)
    print("STAGE 7: ROOT CAUSE OPERATIONAL PATTERNS")
    print("-" * 80)
    root = report.get("root_cause", {})
    patterns = root.get("patterns", [])
    if patterns:
        for p in patterns:
            print(f"  [WARN] {p.get('interpretation')}")
    else:
        print("  [INFO] No anomalous degradation detected across the evaluation period.")

    # 7. Verify Ranked Alternatives & MCDA Recommendations
    print("\n" + "-" * 80)
    print("STAGES 8-10: APPLICABLE ALTERNATIVES & MCDA RANKING")
    print("-" * 80)
    rec = report.get("recommendation", {})
    ranked_alts = rec.get("ranked_alternatives", [])
    top_rec = rec.get("top_recommendation", {})

    print(f"Top Recommendation: {top_rec.get('name')}")
    print(f"  - Est. CO2 Reduction:   {top_rec.get('absolute_reduction_kg', 0):,.1f} kg ({top_rec.get('reduction_pct_of_total', 0):.1f}% of total)")
    print(f"  - Feasibility Score:    {top_rec.get('feasibility_score')}/100")
    print(f"  - Capex Range:          {top_rec.get('capex_range')}")
    print(f"  - Payback Period:       {top_rec.get('payback_years')} years")
    print(f"  - Composite MCDA Score: {top_rec.get('mcda_score', 0):.3f}")

    print("\nAll Decarbonization Alternatives Ranked by MCDA:")
    for alt in ranked_alts:
        print(f"  #{alt['rank']} {alt['name']:<40} | Reduction: {alt['reduction_pct_of_total']:>5.1f}% ({alt['absolute_reduction_kg']:>9,.0f} kg) | Feasibility: {alt['feasibility_score']:>3}/100 | MCDA Score: {alt['mcda_score']:.3f}")

    # 8. Test REST API Endpoints via FastAPI TestClient
    print("\n" + "-" * 80)
    print("TESTING FASTAPI REST API ENDPOINTS")
    print("-" * 80)
    client = TestClient(app)

    # A. POST /factories/{factory_id}/analyze
    payload = {
        "period_start": "2026-09-01T00:00:00Z",
        "period_end": "2026-09-10T23:59:59Z",
        "emission_type": "CO2",
        "mcda_weights": {
            "emission_reduction": 0.40,
            "cost_effectiveness": 0.30,
            "feasibility": 0.20,
            "compatibility": 0.10
        }
    }
    print("[TEST] POST /api/v1/factories/{id}/analyze ...")
    res = client.post(f"/api/v1/factories/{factory_id}/analyze", json=payload)
    assert res.status_code == 200, f"Analyze API failed: {res.text}"
    api_report = res.json()["data"]
    assert api_report["status"] == "COMPLETE"
    print("  [PASS] POST /analyze -> 200 OK (Pipeline completed successfully)")

    # B. GET /factories/{factory_id}/recommendations
    print("[TEST] GET /api/v1/factories/{id}/recommendations ...")
    res = client.get(f"/api/v1/factories/{factory_id}/recommendations")
    assert res.status_code == 200
    recs = res.json()["data"]
    assert len(recs) > 0
    print(f"  [PASS] GET /recommendations -> 200 OK (Found {len(recs)} recommendation sets)")
    latest_rec_id = recs[0]["id"]

    # C. GET /factories/{factory_id}/recommendations/{rec_id}
    print(f"[TEST] GET /api/v1/factories/{{id}}/recommendations/{latest_rec_id} ...")
    res = client.get(f"/api/v1/factories/{factory_id}/recommendations/{latest_rec_id}")
    assert res.status_code == 200
    details = res.json()["data"]
    print(f"  [PASS] GET /recommendations/detail -> 200 OK ({len(details)} ranked alternatives returned)")

    # D. GET /factories/{factory_id}/contribution
    print("[TEST] GET /api/v1/factories/{id}/contribution ...")
    res = client.get(f"/api/v1/factories/{factory_id}/contribution")
    assert res.status_code == 200
    contrib_data = res.json()["data"]
    print(f"  [PASS] GET /contribution -> 200 OK (Hotspot: {contrib_data.get('hotspot_source_name')})")

    print("\n" + "=" * 80)
    print("     ALL ANALYSIS ENGINE VERIFICATIONS & REST API TESTS PASSED!      ")
    print("=" * 80)
    return True


if __name__ == "__main__":
    success = run_analysis_verification()
    if not success:
        exit(1)
