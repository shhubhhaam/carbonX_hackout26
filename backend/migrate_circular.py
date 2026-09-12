"""
Migration: Add Circular Economy, Matching, Traceability, and Verification Tables
"""

import os
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

SQL_MIGRATION = """
-- Byproduct Streams
CREATE TABLE IF NOT EXISTS byproduct_streams (
    id                  TEXT PRIMARY KEY,
    facility_id         TEXT NOT NULL,
    facility_name       TEXT NOT NULL,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL,
    quantity            NUMERIC NOT NULL,
    unit                TEXT NOT NULL DEFAULT 'tonnes',
    available           NUMERIC NOT NULL,
    reserved            NUMERIC NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'available',
    generated_date      DATE,
    expiry_date         DATE,
    description         TEXT,
    quality_spec        JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Off-taker Partners
CREATE TABLE IF NOT EXISTS offtaker_partners (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL,
    location            TEXT NOT NULL,
    distance            NUMERIC NOT NULL DEFAULT 0,
    capacity            NUMERIC NOT NULL DEFAULT 0,
    compatibility       NUMERIC NOT NULL DEFAULT 0,
    cost_value          NUMERIC NOT NULL DEFAULT 0,
    transport_emissions NUMERIC NOT NULL DEFAULT 0,
    fit_score           NUMERIC NOT NULL DEFAULT 0,
    reason              TEXT,
    contact             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular Pathways
CREATE TABLE IF NOT EXISTS circular_pathways (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    stream_id           TEXT NOT NULL REFERENCES byproduct_streams(id) ON DELETE CASCADE,
    partner_id          TEXT REFERENCES offtaker_partners(id) ON DELETE SET NULL,
    partner_name        TEXT,
    type                TEXT NOT NULL,
    co2_benefit         NUMERIC NOT NULL DEFAULT 0,
    circularity         NUMERIC NOT NULL DEFAULT 0,
    economic_value      NUMERIC NOT NULL DEFAULT 0,
    feasibility         NUMERIC NOT NULL DEFAULT 0,
    logistics           NUMERIC NOT NULL DEFAULT 0,
    distance            NUMERIC NOT NULL DEFAULT 0,
    transport_emissions NUMERIC NOT NULL DEFAULT 0,
    cost                NUMERIC NOT NULL DEFAULT 0,
    revenue             NUMERIC NOT NULL DEFAULT 0,
    payback             NUMERIC NOT NULL DEFAULT 0,
    overall_score       NUMERIC NOT NULL DEFAULT 0,
    rejected            BOOLEAN NOT NULL DEFAULT FALSE,
    rejected_reason     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stream Allocations
CREATE TABLE IF NOT EXISTS stream_allocations (
    id                  TEXT PRIMARY KEY,
    stream_id           TEXT NOT NULL REFERENCES byproduct_streams(id) ON DELETE CASCADE,
    partner_id          TEXT REFERENCES offtaker_partners(id) ON DELETE SET NULL,
    partner_name        TEXT NOT NULL,
    quantity            NUMERIC NOT NULL,
    unit                TEXT NOT NULL DEFAULT 'tonnes',
    allocated_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    status              TEXT NOT NULL DEFAULT 'pending',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lifecycle Events (Traceability / DPP)
CREATE TABLE IF NOT EXISTS lifecycle_events (
    id                  TEXT PRIMARY KEY,
    stream_id           TEXT NOT NULL REFERENCES byproduct_streams(id) ON DELETE CASCADE,
    event               TEXT NOT NULL,
    timestamp           TIMESTAMPTZ NOT NULL,
    actor               TEXT NOT NULL,
    quantity            NUMERIC NOT NULL,
    unit                TEXT NOT NULL,
    location            TEXT NOT NULL,
    evidence_ref        TEXT,
    status              TEXT NOT NULL DEFAULT 'confirmed',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Evidence Documents
CREATE TABLE IF NOT EXISTS evidence_documents (
    id                  TEXT PRIMARY KEY,
    stream_id           TEXT NOT NULL REFERENCES byproduct_streams(id) ON DELETE CASCADE,
    type                TEXT NOT NULL,
    description         TEXT NOT NULL,
    uploaded_by         TEXT NOT NULL,
    uploaded_date       DATE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',
    url                 TEXT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verified Outcomes
CREATE TABLE IF NOT EXISTS verified_outcomes (
    id                  TEXT PRIMARY KEY,
    stream_id           TEXT NOT NULL REFERENCES byproduct_streams(id) ON DELETE CASCADE,
    stream_name         TEXT NOT NULL,
    co2_avoided         NUMERIC NOT NULL,
    verified_date       DATE NOT NULL,
    verifier            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending',
    checklist           JSONB NOT NULL DEFAULT '[]',
    issues              JSONB NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular Hotspots
CREATE TABLE IF NOT EXISTS emission_hotspots (
    id                  TEXT PRIMARY KEY,
    facility_id         TEXT NOT NULL,
    process             TEXT NOT NULL,
    source              TEXT NOT NULL,
    emissions           NUMERIC NOT NULL,
    contribution        NUMERIC NOT NULL,
    trend               TEXT DEFAULT 'neutral',
    anomaly             BOOLEAN DEFAULT FALSE,
    opportunity_score   NUMERIC DEFAULT 0,
    priority            TEXT NOT NULL DEFAULT 'medium',
    description         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    print("Running migration: Creating circular economy and traceability tables...")
    cur.execute(SQL_MIGRATION)
    print("Migration executed successfully!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    run_migration()
