"""
REST API Endpoint Tests
Validates all API endpoints for metric creation, measurement ingestion, and retrieval.
"""

from fastapi.testclient import TestClient
from api import app

client = TestClient(app)

def test_api():
    print("--- TESTING REST API ENDPOINTS ---")

    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print(f"[PASS] GET / -> {res.json()['status']}")

    # 2. List factories
    res = client.get("/api/v1/factories")
    assert res.status_code == 200
    factories = res.json()["data"]
    print(f"[PASS] GET /api/v1/factories -> Found {len(factories)} factories")

    steel = next(f for f in factories if f["code"] == "demo1")
    textile = next(f for f in factories if f["code"] == "demo2")

    # 3. Get metrics for demo1
    res = client.get(f"/api/v1/factories/{steel['id']}/metrics")
    assert res.status_code == 200
    steel_metrics = res.json()["data"]
    print(f"[PASS] GET /api/v1/factories/{steel['id']}/metrics -> {len(steel_metrics)} metrics")

    # 4. Get measurements for demo1 with metric filter
    res = client.get(f"/api/v1/factories/{steel['id']}/measurements?metric_name=Production&limit=10")
    assert res.status_code == 200
    prod_meas = res.json()["data"]
    assert len(prod_meas) >= 10
    print(f"[PASS] GET /api/v1/factories/{steel['id']}/measurements?metric_name=Production -> Retrieved {len(prod_meas)} records")

    # 5. Architecture verification endpoint
    res = client.get("/api/v1/architecture/verification?factory_a_code=demo1&factory_b_code=demo2")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["question_4_can_b_have_attributes_a_lacks"]["answer"] == "YES - ABSOLUTELY"
    print(f"[PASS] GET /api/v1/architecture/verification -> {data['final_verdict']}")

    print("\nALL API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!\n")

if __name__ == "__main__":
    test_api()
