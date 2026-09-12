"""
Metadata, Connectors, Emission Factors, Settings & Scenario Simulator API Routes
"""

import os
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

router = APIRouter(prefix="/api/v1", tags=["Emission Factors, Connectors & Simulator"])


def get_conn():
    return psycopg2.connect(DATABASE_URL)


class SimulationRequest(BaseModel):
    baseline_emissions: float = Field(8426.0, example=8426.0)
    pathways_selected: List[str] = Field(default_factory=lambda: ["PWY-001", "PWY-002"])
    renewable_ppa_pct: float = Field(50.0, example=50.0)
    boiler_efficiency_boost_pct: float = Field(15.0, example=15.0)
    carbon_price_per_tonne: float = Field(25.0, example=25.0)


# =============================================================================
# EMISSION FACTORS
# =============================================================================

@router.get("/emission-factors")
def list_emission_factors(
    category: Optional[str] = Query(None),
    region: Optional[str] = Query(None)
):
    """
    Returns verified emission factors library (IPCC AR6, GLEC v3, CEA India, DEFRA 2024).
    """
    factors = [
        {"id": "EF-001", "activity": "Grid Electricity (Western Region)", "factor": 0.716, "unit": "kg CO₂e/kWh", "methodology": "CEA India CO2 Baseline 2024", "category": "Scope 2", "region": "India (Western Grid)", "status": "Active"},
        {"id": "EF-002", "activity": "Natural Gas Combustion", "factor": 2.03, "unit": "kg CO₂e/m³", "methodology": "IPCC 2019 Guidelines Tier 1", "category": "Scope 1", "region": "Global", "status": "Active"},
        {"id": "EF-003", "activity": "Diesel Fuel (Industrial)", "factor": 2.68, "unit": "kg CO₂e/litre", "methodology": "DEFRA GHG Conversion Factors 2024", "category": "Scope 1", "region": "Global", "status": "Active"},
        {"id": "EF-004", "activity": "Road Freight Transport (Heavy Duty)", "factor": 0.084, "unit": "kg CO₂e/tonne-km", "methodology": "GLEC Framework v3.0", "category": "Scope 3", "region": "Asia", "status": "Active"},
        {"id": "EF-005", "activity": "Organic Solid Waste Landfilled", "factor": 0.86, "unit": "t CO₂e/tonne waste", "methodology": "IPCC Waste Model (First Order Decay)", "category": "Scope 1", "region": "Global", "status": "Active"},
        {"id": "EF-006", "activity": "Biogas Recovery (Avoided Methane)", "factor": -0.86, "unit": "t CO₂e/tonne waste", "methodology": "UNFCCC ACM0022", "category": "Avoided", "region": "Global", "status": "Active"},
        {"id": "EF-007", "activity": "Biochar Sequestration", "factor": -1.12, "unit": "t CO₂e/tonne biochar", "methodology": "EBC European Biochar Certificate", "category": "Avoided", "region": "Global", "status": "Active"},
        {"id": "EF-008", "activity": "HFC-134a Refrigerant Leakage", "factor": 1430, "unit": "kg CO₂e/kg gas", "methodology": "IPCC AR6 GWP100", "category": "Scope 1", "region": "Global", "status": "Active"}
    ]
    if category:
        factors = [f for f in factors if f["category"].lower() == category.lower()]
    if region:
        factors = [f for f in factors if region.lower() in f["region"].lower()]
    return {"status": "success", "count": len(factors), "data": factors}


# =============================================================================
# DATA SOURCES & CONNECTORS
# =============================================================================

@router.get("/data-sources/status")
def get_data_sources_status():
    """Returns telemetry connector health, SCADA feeds, and ERP synchronization state."""
    return {
        "status": "success",
        "connectors": [
            {"id": "DS-001", "name": "SCADA Line 01 PLC", "protocol": "Modbus TCP / OPC-UA", "frequency": "1 sec", "status": "Online", "latency_ms": 14, "records_today": 86400, "health": "Healthy"},
            {"id": "DS-002", "name": "SCADA Line 02 Agro Process", "protocol": "OPC-UA", "frequency": "5 sec", "status": "Online", "latency_ms": 18, "records_today": 17280, "health": "Healthy"},
            {"id": "DS-003", "name": "Boiler House Gas Meter", "protocol": "MQTT / LoRaWAN", "frequency": "1 min", "status": "Online", "latency_ms": 42, "records_today": 1440, "health": "Healthy"},
            {"id": "DS-004", "name": "SAP S/4HANA ERP Connector", "protocol": "REST API / OData", "frequency": "Hourly", "status": "Syncing", "latency_ms": 120, "records_today": 24, "health": "Healthy"},
            {"id": "DS-005", "name": "Main Electrical Substation AMI", "protocol": "DLMS/COSEM", "frequency": "15 min", "status": "Online", "latency_ms": 26, "records_today": 96, "health": "Healthy"},
            {"id": "DS-006", "name": "Weighbridge Logistics Terminal", "protocol": "Serial RS-485 to TCP", "frequency": "Event-driven", "status": "Online", "latency_ms": 10, "records_today": 18, "health": "Healthy"}
        ],
        "overall_health": "Optimal (6/6 connectors operating within SLA)"
    }


# =============================================================================
# SETTINGS & GOVERNANCE
# =============================================================================

@router.get("/settings/organization")
def get_org_settings():
    """Organization metadata, GHG inventory boundary, materiality rules, and compliance standards."""
    return {
        "status": "success",
        "data": {
            "organizationName": "IndusTech Sustainability Global",
            "reportingStandard": "GHG Protocol Corporate Standard & ISO 14064-1:2018",
            "consolidationApproach": "Operational Control (100%)",
            "baseYear": 2023,
            "targetYear": 2030,
            "targetReductionPct": 45.0,
            "internalCarbonPriceUsd": 25.0,
            "materialityThresholdPct": 5.0,
            "defaultCurrency": "USD",
            "timeZone": "Asia/Kolkata",
            "auditor": "Bureau Veritas Certification",
            "auditCycle": "Annual Third-Party Attestation"
        }
    }


# =============================================================================
# SCENARIO SIMULATOR
# =============================================================================

@router.post("/simulator/project")
def run_simulation(payload: SimulationRequest):
    """
    Simulates decarbonization trajectories, projected circular carbon avoidance,
    and financial returns (CAPEX, OPEX savings, internal carbon cost avoided).
    """
    base = payload.baseline_emissions
    avoided_streams = len(payload.pathways_selected) * 42.5
    ppa_avoided = (base * 0.25) * (payload.renewable_ppa_pct / 100.0)
    boiler_avoided = (base * 0.16) * (payload.boiler_efficiency_boost_pct / 100.0)

    total_reduction = avoided_streams + ppa_avoided + boiler_avoided
    projected_emissions = max(0, base - total_reduction)
    reduction_pct = round((total_reduction / base) * 100.0, 1)

    carbon_cost_saved = total_reduction * payload.carbon_price_per_tonne
    est_capex = len(payload.pathways_selected) * 35000 + (payload.renewable_ppa_pct * 800)
    est_annual_savings = (len(payload.pathways_selected) * 22000) + carbon_cost_saved
    payback_years = round(est_capex / max(est_annual_savings, 1), 1)

    return {
        "status": "success",
        "results": {
            "baselineEmissions": base,
            "projectedEmissions": round(projected_emissions, 1),
            "totalReduction": round(total_reduction, 1),
            "reductionPct": reduction_pct,
            "avoidedFromCircularReuse": round(avoided_streams, 1),
            "avoidedFromRenewablePPA": round(ppa_avoided, 1),
            "avoidedFromBoilerEfficiency": round(boiler_avoided, 1),
            "estimatedCapex": est_capex,
            "annualCostSavings": round(est_annual_savings, 2),
            "paybackYears": payback_years,
            "complianceTrajectory": "On track for 2030 Science-Based Target (SBTi 1.5°C)" if reduction_pct >= 40 else "Requires additional intervention"
        }
    }
