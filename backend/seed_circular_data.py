"""
Seed Circular Economy & CarbonX Domain Data to Supabase PostgreSQL
"""

import os
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

HOTSPOTS_DATA = [
    {
        "id": "HS-001",
        "facility_id": "GIF-001",
        "process": "Organic Waste Processing",
        "source": "Organic waste decomposition",
        "emissions": 1568,
        "contribution": 18.6,
        "trend": "+8.2%",
        "anomaly": True,
        "opportunity_score": 92,
        "priority": "critical",
        "description": "Organic waste from Production Line 02 is currently landfilled, generating significant methane emissions. Diversion to biogas or composting pathways could recover 86 tCO₂e annually and generate revenue from byproducts."
    },
    {
        "id": "HS-002",
        "facility_id": "GIF-001",
        "process": "Natural Gas Boiler",
        "source": "Natural gas combustion",
        "emissions": 1382,
        "contribution": 16.4,
        "trend": "-3.7%",
        "anomaly": False,
        "opportunity_score": 74,
        "priority": "high",
        "description": "The boiler house consumes 1,200 GJ/month of natural gas. Fuel switching to biomethane or installing waste-heat recovery systems could reduce emissions by up to 35%."
    },
    {
        "id": "HS-003",
        "facility_id": "GIF-001",
        "process": "Production Line 01 – Heat",
        "source": "Process heat losses",
        "emissions": 1162,
        "contribution": 13.8,
        "trend": "-5.1%",
        "anomaly": False,
        "opportunity_score": 68,
        "priority": "high",
        "description": "High-temperature process heat on Production Line 01 is vented without recovery. Heat exchanger installation is estimated to recover 420 GJ/month and reduce Scope 1 by 13%."
    },
    {
        "id": "HS-004",
        "facility_id": "GIF-001",
        "process": "Grid Electricity",
        "source": "Purchased electricity",
        "emissions": 943,
        "contribution": 11.2,
        "trend": "-6.4%",
        "anomaly": False,
        "opportunity_score": 61,
        "priority": "medium",
        "description": "Grid electricity purchased from coal-heavy regional grid. Renewable Power Purchase Agreement (PPA) or on-site solar installation could eliminate this Scope 2 contribution."
    },
    {
        "id": "HS-005",
        "facility_id": "GIF-001",
        "process": "Refrigeration Units",
        "source": "F-gas leakage",
        "emissions": 714,
        "contribution": 8.5,
        "trend": "+2.1%",
        "anomaly": True,
        "opportunity_score": 55,
        "priority": "medium",
        "description": "Refrigerant leakage detected on cold-storage units. Anomalous increase in HFC-134a consumption suggests seal failures. Urgent maintenance and switch to low-GWP refrigerants recommended."
    },
    {
        "id": "HS-006",
        "facility_id": "GIF-001",
        "process": "Fleet & Transport",
        "source": "Diesel fleet",
        "emissions": 588,
        "contribution": 7.0,
        "trend": "-1.8%",
        "anomaly": False,
        "opportunity_score": 42,
        "priority": "low",
        "description": "Eight diesel trucks operate on logistics routes within a 150 km radius. Electric vehicle conversion for short-haul routes could reduce transport emissions by 60% over 3 years."
    },
    {
        "id": "HS-007",
        "facility_id": "GIF-001",
        "process": "Wastewater Treatment",
        "source": "Biological treatment",
        "emissions": 420,
        "contribution": 5.0,
        "trend": "-0.5%",
        "anomaly": False,
        "opportunity_score": 38,
        "priority": "low",
        "description": "Aerobic wastewater lagoon releases small amounts of methane and nitrous oxide during aeration cycle down-times. Mechanical aerator timing optimization can reduce this."
    }
]

STREAMS_DATA = [
    {
        "id": "CX-ORG-2048",
        "facility_id": "GIF-001",
        "facility_name": "Gujarat Industrial Facility",
        "name": "Organic Waste – Q3 2025",
        "type": "organic",
        "quantity": 100,
        "unit": "tonnes",
        "available": 62,
        "reserved": 38,
        "status": "allocated",
        "generated_date": "2025-07-01",
        "expiry_date": "2025-10-31",
        "description": "Mixed organic waste stream from agro-processing operations including fruit pulp, vegetable matter, and process washings. Moisture content ~72%. BMP (biochemical methane potential) 280 L CH₄/kg VS.",
        "quality_spec": {"moisture": 72, "bmp": 280, "ph": 6.8}
    },
    {
        "id": "CX-CO2-1842",
        "facility_id": "GIF-001",
        "facility_name": "Gujarat Industrial Facility",
        "name": "Captured CO₂ – Fermentation",
        "type": "captured-co2",
        "quantity": 8.7,
        "unit": "tonnes",
        "available": 0,
        "reserved": 8.7,
        "status": "matched",
        "generated_date": "2025-08-01",
        "expiry_date": "2025-11-30",
        "description": "High-purity CO₂ (99.5%) captured from fermentation vessels. Food-grade quality. Suitable for carbonation, greenhouses, or enhanced oil recovery.",
        "quality_spec": {"purity_pct": 99.5, "grade": "food-grade"}
    },
    {
        "id": "CX-ASH-1731",
        "facility_id": "GIF-001",
        "facility_name": "Gujarat Industrial Facility",
        "name": "Biomass Ash – Boiler",
        "type": "ash",
        "quantity": 4.2,
        "unit": "tonnes",
        "available": 4.2,
        "reserved": 0,
        "status": "available",
        "generated_date": "2025-08-15",
        "expiry_date": "2026-02-28",
        "description": "Wood biomass ash from the boiler house. High potassium content (12% K₂O). Suitable as agricultural soil amendment or cement supplementary cementitious material.",
        "quality_spec": {"k2o_pct": 12.0, "ph": 11.2}
    },
    {
        "id": "CX-BIO-0991",
        "facility_id": "MBP-002",
        "facility_name": "Mumbai Bioprocessing Plant",
        "name": "Biogas Digestate",
        "type": "organic",
        "quantity": 24,
        "unit": "tonnes",
        "available": 24,
        "reserved": 0,
        "status": "available",
        "generated_date": "2025-08-20",
        "expiry_date": "2025-12-31",
        "description": "Digested slurry from biogas plant. Rich in ammonia-N (2.1 kg/tonne). Suitable as liquid biofertiliser. Transport required within 50 km to avoid nitrogen losses.",
        "quality_spec": {"nitrogen_kg_per_t": 2.1, "liquid": True}
    }
]

PARTNERS_DATA = [
    {
        "id": "PTR-001",
        "name": "GreenLoop Biogas Facility",
        "type": "Biogas Plant",
        "location": "Vatva GIDC, Ahmedabad",
        "distance": 34,
        "capacity": 200,
        "compatibility": 94,
        "cost_value": 82,
        "transport_emissions": 2.8,
        "fit_score": 91,
        "reason": "High organic content match. Anaerobic digestion technology compatible with waste moisture and BMP. Has existing offtake agreement for biogas grid injection.",
        "contact": "greenloop@example.com"
    },
    {
        "id": "PTR-002",
        "name": "EcoCycle Composting",
        "type": "Composting Facility",
        "location": "Naroda, Ahmedabad",
        "distance": 28,
        "capacity": 150,
        "compatibility": 86,
        "cost_value": 74,
        "transport_emissions": 2.2,
        "fit_score": 83,
        "reason": "In-vessel composting with ISO 17225 certification. Finished compost sold to regional agricultural cooperatives. Shorter transport distance vs. biogas option.",
        "contact": "ecocycle@example.com"
    },
    {
        "id": "PTR-003",
        "name": "BioCarbon Processing",
        "type": "Pyrolysis Plant",
        "location": "Sanand, Ahmedabad",
        "distance": 48,
        "capacity": 80,
        "compatibility": 71,
        "cost_value": 68,
        "transport_emissions": 3.9,
        "fit_score": 72,
        "reason": "Higher carbon sequestration benefit. However, capacity is constrained at 80 t/month. Would require moisture pre-treatment to reduce from 72% to <50% for efficient pyrolysis.",
        "contact": "biocarbon@example.com"
    },
    {
        "id": "PTR-004",
        "name": "AgriGrow Fertilisers",
        "type": "Agricultural Cooperative",
        "location": "Mehsana, Gujarat",
        "distance": 95,
        "capacity": 500,
        "compatibility": 45,
        "cost_value": 55,
        "transport_emissions": 7.8,
        "fit_score": 41,
        "reason": "Purity too low for direct organic certification requirements. Transport distance exceeds threshold for cost-effective biomaterial logistics.",
        "contact": "agrigrow@example.com"
    }
]

PATHWAYS_DATA = [
    {
        "id": "PWY-001",
        "name": "Biogas Recovery",
        "stream_id": "CX-ORG-2048",
        "partner_id": "PTR-001",
        "partner_name": "GreenLoop Biogas Facility",
        "type": "biogas",
        "co2_benefit": 86,
        "circularity": 92,
        "economic_value": 82,
        "feasibility": 88,
        "logistics": 84,
        "distance": 34,
        "transport_emissions": 2.8,
        "cost": 45000,
        "revenue": 73000,
        "payback": 18,
        "overall_score": 88,
        "rejected": False,
        "rejected_reason": None
    },
    {
        "id": "PWY-002",
        "name": "In-vessel Composting",
        "stream_id": "CX-ORG-2048",
        "partner_id": "PTR-002",
        "partner_name": "EcoCycle Composting",
        "type": "composting",
        "co2_benefit": 54,
        "circularity": 78,
        "economic_value": 74,
        "feasibility": 82,
        "logistics": 90,
        "distance": 28,
        "transport_emissions": 2.2,
        "cost": 18000,
        "revenue": 32000,
        "payback": 9,
        "overall_score": 76,
        "rejected": False,
        "rejected_reason": None
    },
    {
        "id": "PWY-003",
        "name": "Pyrolysis – Biochar",
        "stream_id": "CX-ORG-2048",
        "partner_id": "PTR-003",
        "partner_name": "BioCarbon Processing",
        "type": "biochar",
        "co2_benefit": 112,
        "circularity": 88,
        "economic_value": 68,
        "feasibility": 64,
        "logistics": 72,
        "distance": 48,
        "transport_emissions": 3.9,
        "cost": 95000,
        "revenue": 133000,
        "payback": 36,
        "overall_score": 73,
        "rejected": False,
        "rejected_reason": None
    },
    {
        "id": "PWY-004",
        "name": "Landfill (Baseline)",
        "stream_id": "CX-ORG-2048",
        "partner_id": None,
        "partner_name": "Municipal Landfill",
        "type": "landfill",
        "co2_benefit": 0,
        "circularity": 0,
        "economic_value": 10,
        "feasibility": 95,
        "logistics": 78,
        "distance": 18,
        "transport_emissions": 1.5,
        "cost": 8000,
        "revenue": 0,
        "payback": 0,
        "overall_score": 18,
        "rejected": False,
        "rejected_reason": None
    },
    {
        "id": "PWY-005",
        "name": "Direct Agricultural Reuse",
        "stream_id": "CX-ORG-2048",
        "partner_id": "PTR-004",
        "partner_name": "AgriGrow Fertilisers",
        "type": "composting",
        "co2_benefit": 22,
        "circularity": 45,
        "economic_value": 38,
        "feasibility": 30,
        "logistics": 28,
        "distance": 95,
        "transport_emissions": 7.8,
        "cost": 22000,
        "revenue": 12000,
        "payback": 0,
        "overall_score": 36,
        "rejected": True,
        "rejected_reason": "Transport distance exceeds 50 km economic boundary; nitrogen volatilisation risk exceeds threshold."
    }
]

ALLOCATIONS_DATA = [
    {
        "id": "ALC-001",
        "stream_id": "CX-ORG-2048",
        "partner_id": "PTR-001",
        "partner_name": "GreenLoop Biogas Facility",
        "quantity": 38,
        "unit": "tonnes",
        "allocated_date": "2025-07-15",
        "status": "verified"
    }
]

LIFECYCLE_DATA = [
    {"id": "EVT-001", "stream_id": "CX-ORG-2048", "event": "Stream Generated", "timestamp": "2025-07-01T06:30:00Z", "actor": "Gujarat Industrial Facility", "quantity": 100, "unit": "tonnes", "location": "Production Line 02, GIF-001", "evidence_ref": "EV-001", "status": "confirmed"},
    {"id": "EVT-002", "stream_id": "CX-ORG-2048", "event": "Stream Characterized", "timestamp": "2025-07-03T10:00:00Z", "actor": "CarbonX Lab Analysis", "quantity": 100, "unit": "tonnes", "location": "GIF-001 Laboratory", "evidence_ref": "EV-002", "status": "confirmed"},
    {"id": "EVT-003", "stream_id": "CX-ORG-2048", "event": "Pathway Matched", "timestamp": "2025-07-10T14:20:00Z", "actor": "CarbonX Platform", "quantity": 100, "unit": "tonnes", "location": "Platform (Digital)", "evidence_ref": "EV-003", "status": "confirmed"},
    {"id": "EVT-004", "stream_id": "CX-ORG-2048", "event": "Allocation Confirmed", "timestamp": "2025-07-15T09:00:00Z", "actor": "GreenLoop Biogas Facility", "quantity": 38, "unit": "tonnes", "location": "Vatva GIDC, Ahmedabad", "evidence_ref": "EV-004", "status": "confirmed"},
    {"id": "EVT-005", "stream_id": "CX-ORG-2048", "event": "Dispatch Recorded", "timestamp": "2025-08-01T05:45:00Z", "actor": "Gujarat Industrial Facility", "quantity": 38, "unit": "tonnes", "location": "GIF-001 Loading Bay", "evidence_ref": "EV-005", "status": "confirmed"},
    {"id": "EVT-006", "stream_id": "CX-ORG-2048", "event": "Receipt Confirmed", "timestamp": "2025-08-01T10:30:00Z", "actor": "GreenLoop Biogas Facility", "quantity": 38, "unit": "tonnes", "location": "Vatva GIDC, Ahmedabad", "evidence_ref": "EV-006", "status": "confirmed"},
    {"id": "EVT-007", "stream_id": "CX-ORG-2048", "event": "Utilisation Evidence Uploaded", "timestamp": "2025-08-15T08:00:00Z", "actor": "GreenLoop Biogas Facility", "quantity": 38, "unit": "tonnes", "location": "Biogas Plant, Vatva", "evidence_ref": "EV-007", "status": "confirmed"},
    {"id": "EVT-008", "stream_id": "CX-ORG-2048", "event": "Verification Initiated", "timestamp": "2025-09-01T09:00:00Z", "actor": "CarbonX Verification Engine", "quantity": 38, "unit": "tonnes", "location": "Platform (Digital)", "evidence_ref": "EV-008", "status": "pending"}
]

EVIDENCE_DATA = [
    {"id": "EV-001", "stream_id": "CX-ORG-2048", "type": "Generation Log", "description": "Automated production log from SCADA line 02", "uploaded_by": "System (SCADA)", "uploaded_date": "2025-07-01", "status": "verified", "url": "#"},
    {"id": "EV-002", "stream_id": "CX-ORG-2048", "type": "Lab Analysis Certificate", "description": "Full biochemical analysis (moisture, BMP, heavy metals)", "uploaded_by": "Quality Team", "uploaded_date": "2025-07-03", "status": "verified", "url": "#"},
    {"id": "EV-003", "stream_id": "CX-ORG-2048", "type": "MCDA Optimization Output", "description": "Algorithm match score run #8421 with sensitivity analysis", "uploaded_by": "CarbonX Engine", "uploaded_date": "2025-07-10", "status": "verified", "url": "#"},
    {"id": "EV-004", "stream_id": "CX-ORG-2048", "type": "Offtake Agreement", "description": "Signed bilateral agreement with GreenLoop Biogas Facility", "uploaded_by": "Commercial Ops", "uploaded_date": "2025-07-15", "status": "verified", "url": "#"},
    {"id": "EV-005", "stream_id": "CX-ORG-2048", "type": "Electronic Waybill & Weighbridge Ticket", "description": "Weighbridge gross/tare/net slip (Net: 38.00 t)", "uploaded_by": "Logistics Dispatch", "uploaded_date": "2025-08-01", "status": "verified", "url": "#"},
    {"id": "EV-006", "stream_id": "CX-ORG-2048", "type": "Delivery Receipt Note", "description": "Signed delivery receipt from GreenLoop receiving bay", "uploaded_by": "GreenLoop Gate Ops", "uploaded_date": "2025-08-01", "status": "verified", "url": "#"},
    {"id": "EV-007", "stream_id": "CX-ORG-2048", "type": "Digester Meter Reading", "description": "SCADA feed showing feed into Digester #2", "uploaded_by": "Plant Superintendent", "uploaded_date": "2025-08-15", "status": "verified", "url": "#"},
    {"id": "EV-008", "stream_id": "CX-ORG-2048", "type": "Third-Party Audit Attestation", "description": "Independent verification check by accredited auditor", "uploaded_by": "Auditor (Bureau Veritas)", "uploaded_date": "2025-09-01", "status": "pending", "url": "#"}
]

VERIFIED_DATA = [
    {
        "id": "VFO-001",
        "stream_id": "CX-ORG-2048",
        "stream_name": "Organic Waste – Q3 2025",
        "co2_avoided": 86,
        "verified_date": "2025-09-01",
        "verifier": "CarbonX Verification Engine",
        "status": "verified",
        "checklist": [
            "Allocation valid and quantity confirmed",
            "Dispatch manifest recorded and signed",
            "Receipt confirmation within 0.5% of dispatched quantity",
            "Quantities reconcile (37.8 t received vs 38 t dispatched)",
            "Utilisation evidence uploaded and authentic",
            "Recipient confirmation received"
        ],
        "issues": []
    },
    {
        "id": "VFO-002",
        "stream_id": "CX-ASH-1731",
        "stream_name": "Biomass Ash – Boiler",
        "co2_avoided": 18,
        "verified_date": "2025-08-20",
        "verifier": "CarbonX Verification Engine",
        "status": "requires-review",
        "checklist": [
            "Allocation valid and quantity confirmed",
            "Dispatch manifest recorded and signed",
            "Receipt confirmation within 0.5% of dispatched quantity",
            "Quantities reconcile"
        ],
        "issues": [
            "Utilisation evidence not yet uploaded by recipient",
            "Recipient confirmation pending for 11 days"
        ]
    }
]

CIRCULAR_RECS = [
    {"id": "REC-001", "stream_id": "CX-ORG-2048", "title": "Biogas Recovery via Anaerobic Digestion", "category": "recover", "co2_benefit": 86, "cost": 45000, "savings": 28000, "circularity": 92, "feasibility": 88, "confidence": 91, "reason": "Stream biochemical methane potential and moisture content (72%) are ideal for anaerobic digestion. GreenLoop Biogas Facility is 34 km away with sufficient capacity.", "pathway": "Biogas"},
    {"id": "REC-002", "stream_id": "CX-ORG-2048", "title": "In-vessel Composting to Soil Amendment", "category": "reuse", "co2_benefit": 54, "cost": 18000, "savings": 14000, "circularity": 78, "feasibility": 82, "confidence": 85, "reason": "Low-capex alternative. EcoCycle Composting operates an IVC facility 28 km away. Compost output can displace synthetic fertiliser at partner farms.", "pathway": "Composting"},
    {"id": "REC-003", "stream_id": "CX-ORG-2048", "title": "Biochar Production via Pyrolysis", "category": "process-change", "co2_benefit": 112, "cost": 95000, "savings": 38000, "circularity": 88, "feasibility": 64, "confidence": 72, "reason": "Highest carbon sequestration potential. Biochar permanently sequesters ~35% of carbon. BioCarbon Processing can process this stream, but capital investment is high.", "pathway": "Biochar"},
    {"id": "REC-004", "stream_id": "CX-ORG-2048", "title": "Reduce Organic Waste at Source", "category": "reduce", "co2_benefit": 32, "cost": 8000, "savings": 9500, "circularity": 55, "feasibility": 76, "confidence": 80, "reason": "Process optimisation on Production Line 02 can reduce organic waste generation by 20% through better yield management and inventory control.", "pathway": "N/A"},
    {"id": "REC-005", "stream_id": "CX-ASH-1731", "title": "Agricultural Soil Amendment Reuse", "category": "reuse", "co2_benefit": 18, "cost": 2000, "savings": 6500, "circularity": 85, "feasibility": 90, "confidence": 88, "reason": "Biomass ash with 12% K₂O content directly substitutes potassium fertiliser. Local farmers within 25 km can absorb full stream quantity.", "pathway": "Direct Reuse"},
    {"id": "REC-006", "stream_id": "CX-CO2-1842", "title": "Greenhouse CO₂ Enrichment", "category": "substitute", "co2_benefit": 8.7, "cost": 12000, "savings": 15000, "circularity": 72, "feasibility": 78, "confidence": 82, "reason": "Food-grade CO₂ from fermentation can directly supply greenhouse operations within 60 km, substituting commercial CO₂ at market rate of ₹45/kg.", "pathway": "Direct Supply"}
]

def seed():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Create circular_recommendations table if not exists
    cur.execute("""
    CREATE TABLE IF NOT EXISTS circular_recommendations (
        id              TEXT PRIMARY KEY,
        stream_id       TEXT,
        title           TEXT NOT NULL,
        category        TEXT NOT NULL,
        co2_benefit     NUMERIC NOT NULL,
        cost            NUMERIC NOT NULL,
        savings         NUMERIC NOT NULL,
        circularity     NUMERIC NOT NULL,
        feasibility     NUMERIC NOT NULL,
        confidence      NUMERIC NOT NULL,
        reason          TEXT,
        pathway         TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """)

    print("Seeding Hotspots...")
    for h in HOTSPOTS_DATA:
        cur.execute("""
        INSERT INTO emission_hotspots (id, facility_id, process, source, emissions, contribution, trend, anomaly, opportunity_score, priority, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            emissions = EXCLUDED.emissions,
            contribution = EXCLUDED.contribution,
            trend = EXCLUDED.trend,
            anomaly = EXCLUDED.anomaly,
            opportunity_score = EXCLUDED.opportunity_score,
            priority = EXCLUDED.priority,
            description = EXCLUDED.description;
        """, (h["id"], h["facility_id"], h["process"], h["source"], h["emissions"], h["contribution"], h["trend"], h["anomaly"], h["opportunity_score"], h["priority"], h["description"]))

    print("Seeding Streams...")
    for s in STREAMS_DATA:
        cur.execute("""
        INSERT INTO byproduct_streams (id, facility_id, facility_name, name, type, quantity, unit, available, reserved, status, generated_date, expiry_date, description, quality_spec)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            available = EXCLUDED.available,
            reserved = EXCLUDED.reserved,
            status = EXCLUDED.status,
            description = EXCLUDED.description;
        """, (s["id"], s["facility_id"], s["facility_name"], s["name"], s["type"], s["quantity"], s["unit"], s["available"], s["reserved"], s["status"], s["generated_date"], s["expiry_date"], s["description"], Json(s["quality_spec"])))

    print("Seeding Partners...")
    for p in PARTNERS_DATA:
        cur.execute("""
        INSERT INTO offtaker_partners (id, name, type, location, distance, capacity, compatibility, cost_value, transport_emissions, fit_score, reason, contact)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            capacity = EXCLUDED.capacity,
            compatibility = EXCLUDED.compatibility,
            cost_value = EXCLUDED.cost_value,
            fit_score = EXCLUDED.fit_score,
            reason = EXCLUDED.reason;
        """, (p["id"], p["name"], p["type"], p["location"], p["distance"], p["capacity"], p["compatibility"], p["cost_value"], p["transport_emissions"], p["fit_score"], p["reason"], p["contact"]))

    print("Seeding Pathways...")
    for pw in PATHWAYS_DATA:
        cur.execute("""
        INSERT INTO circular_pathways (id, name, stream_id, partner_id, partner_name, type, co2_benefit, circularity, economic_value, feasibility, logistics, distance, transport_emissions, cost, revenue, payback, overall_score, rejected, rejected_reason)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            co2_benefit = EXCLUDED.co2_benefit,
            circularity = EXCLUDED.circularity,
            overall_score = EXCLUDED.overall_score,
            rejected = EXCLUDED.rejected,
            rejected_reason = EXCLUDED.rejected_reason;
        """, (pw["id"], pw["name"], pw["stream_id"], pw["partner_id"], pw["partner_name"], pw["type"], pw["co2_benefit"], pw["circularity"], pw["economic_value"], pw["feasibility"], pw["logistics"], pw["distance"], pw["transport_emissions"], pw["cost"], pw["revenue"], pw["payback"], pw["overall_score"], pw["rejected"], pw["rejected_reason"]))

    print("Seeding Allocations...")
    for a in ALLOCATIONS_DATA:
        cur.execute("""
        INSERT INTO stream_allocations (id, stream_id, partner_id, partner_name, quantity, unit, allocated_date, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
        """, (a["id"], a["stream_id"], a["partner_id"], a["partner_name"], a["quantity"], a["unit"], a["allocated_date"], a["status"]))

    print("Seeding Lifecycle Events...")
    for ev in LIFECYCLE_DATA:
        cur.execute("""
        INSERT INTO lifecycle_events (id, stream_id, event, timestamp, actor, quantity, unit, location, evidence_ref, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
        """, (ev["id"], ev["stream_id"], ev["event"], ev["timestamp"], ev["actor"], ev["quantity"], ev["unit"], ev["location"], ev["evidence_ref"], ev["status"]))

    print("Seeding Evidence Documents...")
    for doc in EVIDENCE_DATA:
        cur.execute("""
        INSERT INTO evidence_documents (id, stream_id, type, description, uploaded_by, uploaded_date, status, url)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;
        """, (doc["id"], doc["stream_id"], doc["type"], doc["description"], doc["uploaded_by"], doc["uploaded_date"], doc["status"], doc["url"]))

    print("Seeding Verified Outcomes...")
    for vo in VERIFIED_DATA:
        cur.execute("""
        INSERT INTO verified_outcomes (id, stream_id, stream_name, co2_avoided, verified_date, verifier, status, checklist, issues)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            co2_avoided = EXCLUDED.co2_avoided,
            status = EXCLUDED.status,
            checklist = EXCLUDED.checklist,
            issues = EXCLUDED.issues;
        """, (vo["id"], vo["stream_id"], vo["stream_name"], vo["co2_avoided"], vo["verified_date"], vo["verifier"], vo["status"], Json(vo["checklist"]), Json(vo["issues"])))

    print("Seeding Circular Recommendations...")
    for rec in CIRCULAR_RECS:
        cur.execute("""
        INSERT INTO circular_recommendations (id, stream_id, title, category, co2_benefit, cost, savings, circularity, feasibility, confidence, reason, pathway)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            co2_benefit = EXCLUDED.co2_benefit,
            cost = EXCLUDED.cost,
            savings = EXCLUDED.savings,
            circularity = EXCLUDED.circularity,
            feasibility = EXCLUDED.feasibility;
        """, (rec["id"], rec["stream_id"], rec["title"], rec["category"], rec["co2_benefit"], rec["cost"], rec["savings"], rec["circularity"], rec["feasibility"], rec["confidence"], rec["reason"], rec["pathway"]))

    print("All Circular Economy data seeded successfully!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed()
