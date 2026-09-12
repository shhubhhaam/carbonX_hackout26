-- =============================================================================
-- INDUSTRIAL SUSTAINABILITY INTELLIGENCE PLATFORM
-- Supabase PostgreSQL Schema
-- =============================================================================
-- Design Principles:
--   1. Metadata-driven: metric definitions are rows, not columns
--   2. Multi-tenant: all data scoped to organizations
--   3. Append-only measurements: raw data is never overwritten
--   4. Full traceability: every derived result links back to source
--   5. Versioned: emission factors, features, models, recommendations
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE data_type_enum AS ENUM (
    'numeric',
    'categorical',
    'boolean',
    'datetime',
    'json'
);

CREATE TYPE quality_status_enum AS ENUM (
    'RAW',
    'VALIDATED',
    'SUSPECT',
    'REJECTED'
);

CREATE TYPE source_type_enum AS ENUM (
    'SCADA',
    'MANUAL',
    'IOT',
    'ERP',
    'CSV',
    'API',
    'CALCULATED'
);

CREATE TYPE aggregation_method_enum AS ENUM (
    'sum',
    'avg',
    'last',
    'min',
    'max',
    'count'
);

CREATE TYPE formula_type_enum AS ENUM (
    'ratio',
    'rolling_avg',
    'rate_of_change',
    'std_dev',
    'cumulative_sum',
    'percentage',
    'custom'
);

CREATE TYPE importance_method_enum AS ENUM (
    'SHAP',
    'permutation',
    'correlation',
    'coefficient',
    'custom'
);

CREATE TYPE alternative_category_enum AS ENUM (
    'fuel_switch',
    'efficiency_improvement',
    'electrification',
    'renewable_energy',
    'heat_recovery',
    'material_substitution',
    'process_optimization',
    'carbon_capture',
    'waste_reduction'
);

CREATE TYPE emission_source_category_enum AS ENUM (
    'stationary_combustion',
    'mobile_combustion',
    'process_emission',
    'electricity_consumption',
    'fugitive_emission',
    'waste_treatment',
    'transport'
);

-- =============================================================================
-- LAYER 1: PLATFORM / TENANT LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organizations
-- Top-level tenant. All data belongs to an organization.
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                TEXT NOT NULL,
    slug                TEXT UNIQUE NOT NULL,
    industry_sector     TEXT,
    country             TEXT,
    timezone            TEXT NOT NULL DEFAULT 'UTC',
    settings            JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Top-level multi-tenant entity. Every factory, user, and data record belongs to an organization.';
COMMENT ON COLUMN organizations.slug IS 'URL-safe unique identifier for the organization.';
COMMENT ON COLUMN organizations.settings IS 'Org-level configuration such as default currency, reporting standards, feature flags.';

-- -----------------------------------------------------------------------------
-- users
-- Platform users. Authentication handled by Supabase Auth; this extends it.
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY,  -- MUST match auth.users.id from Supabase Auth
    email           TEXT UNIQUE NOT NULL,
    full_name       TEXT,
    avatar_url      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Extends Supabase Auth users with platform profile data. id must match auth.users.id.';

-- -----------------------------------------------------------------------------
-- roles
-- Seeded platform roles. Not user-created.
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT UNIQUE NOT NULL,
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE roles IS 'Platform roles: PLATFORM_ADMIN, ORG_ADMIN, FACTORY_MANAGER, PLANT_OPERATOR, SUSTAINABILITY_OFFICER, AUDITOR.';
COMMENT ON COLUMN roles.permissions IS 'Array of permission strings, e.g. ["read:emissions", "write:measurements", "manage:users"].';

-- Seed base roles
INSERT INTO roles (id, name, description, permissions) VALUES
    (uuid_generate_v4(), 'PLATFORM_ADMIN',          'Full platform access',                         '["*"]'),
    (uuid_generate_v4(), 'ORG_ADMIN',               'Full access within their organization',        '["org:*"]'),
    (uuid_generate_v4(), 'FACTORY_MANAGER',          'View emissions, hotspots, recommendations',    '["read:*", "approve:recommendations"]'),
    (uuid_generate_v4(), 'PLANT_OPERATOR',           'Enter and verify operational data',            '["write:measurements", "read:measurements"]'),
    (uuid_generate_v4(), 'SUSTAINABILITY_OFFICER',   'Analyze emissions, manage alternatives',       '["read:*", "write:recommendations", "export:reports"]'),
    (uuid_generate_v4(), 'AUDITOR',                  'Read-only access to all data and audit trails','["read:*", "read:audit"]');

-- -----------------------------------------------------------------------------
-- user_organization_roles
-- Many-to-many: user <-> organization, with a role per membership.
-- Optionally scoped to a specific factory.
-- -----------------------------------------------------------------------------
CREATE TABLE user_organization_roles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role_id             UUID NOT NULL REFERENCES roles(id),
    factory_id          UUID,  -- FK added after factories table is created
    granted_by          UUID REFERENCES users(id),
    granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    UNIQUE (user_id, organization_id, role_id, factory_id)
);

COMMENT ON TABLE user_organization_roles IS 'Assigns a user a role within an organization, optionally scoped to a specific factory.';

-- =============================================================================
-- LAYER 2: FACTORY STRUCTURE LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- factories
-- A physical industrial facility belonging to an organization.
-- -----------------------------------------------------------------------------
CREATE TABLE factories (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    name                TEXT NOT NULL,
    code                TEXT,
    industry_type       TEXT NOT NULL,
    location            TEXT,
    latitude            NUMERIC(9, 6),
    longitude           NUMERIC(9, 6),
    commissioned_at     DATE,
    metadata            JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, code)
);

COMMENT ON TABLE factories IS 'Physical industrial facility. Different factories in the same org can have completely different metrics.';
COMMENT ON COLUMN factories.industry_type IS 'e.g. Steel, Textile, Chemical, Automobile, Cement, Food, Manufacturing.';
COMMENT ON COLUMN factories.metadata IS 'Arbitrary factory-level metadata such as production capacity, regulatory IDs, certifications.';

-- Add deferred FK for factory_id in user_organization_roles
ALTER TABLE user_organization_roles
    ADD CONSTRAINT uor_factory_fk FOREIGN KEY (factory_id)
    REFERENCES factories(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- departments
-- Organizational units within a factory (optional grouping layer).
-- -----------------------------------------------------------------------------
CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id      UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE departments IS 'Optional organizational subdivision within a factory, e.g. Melting Shop, Dyeing Unit.';

-- -----------------------------------------------------------------------------
-- processes
-- A distinct industrial process (can span multiple machines).
-- -----------------------------------------------------------------------------
CREATE TABLE processes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id      UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    process_type    TEXT,
    description     TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE processes IS 'Industrial process, e.g. Blast Furnace Operation, Dyeing, Electrolysis, Steam Generation.';

-- -----------------------------------------------------------------------------
-- machines
-- Physical equipment/machines within a process.
-- -----------------------------------------------------------------------------
CREATE TABLE machines (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id          UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    process_id          UUID REFERENCES processes(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    machine_type        TEXT,
    model_number        TEXT,
    manufacturer        TEXT,
    installed_at        DATE,
    rated_capacity      NUMERIC,
    capacity_unit       TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE machines IS 'Physical equipment: Furnace-1, Boiler-A, Generator-3. Linked to a process and factory.';

-- -----------------------------------------------------------------------------
-- data_sources
-- Origin of measurement data: SCADA, manual entry, IoT, ERP, CSV upload.
-- -----------------------------------------------------------------------------
CREATE TABLE data_sources (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id          UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    source_type         source_type_enum NOT NULL,
    connection_config   JSONB NOT NULL DEFAULT '{}',  -- Store encrypted or use vault
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE data_sources IS 'Where measurement data originates. connection_config should be encrypted at application layer.';

-- =============================================================================
-- LAYER 3: DYNAMIC INDUSTRIAL DATA LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- metric_definitions
-- Schema registry: describes WHAT a factory measures.
-- Adding a new metric = inserting a row. No schema migration required.
-- -----------------------------------------------------------------------------
CREATE TABLE metric_definitions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    factory_id              UUID REFERENCES factories(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    display_name            TEXT,
    description             TEXT,
    category                TEXT NOT NULL,
    data_type               data_type_enum NOT NULL,
    unit                    TEXT,
    unit_system             TEXT DEFAULT 'SI',
    aggregation_method      aggregation_method_enum DEFAULT 'sum',
    is_input                BOOLEAN NOT NULL DEFAULT TRUE,
    validation_rules        JSONB NOT NULL DEFAULT '{}',
    tags                    TEXT[] DEFAULT '{}',
    version                 INTEGER NOT NULL DEFAULT 1,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (factory_id, name, version)
);

COMMENT ON TABLE metric_definitions IS 'Metadata registry for all measurable parameters. factory_id=NULL means org-level template.';
COMMENT ON COLUMN metric_definitions.is_input IS 'TRUE = directly measured/entered. FALSE = calculated/derived (not raw measurement).';
COMMENT ON COLUMN metric_definitions.validation_rules IS 'Flexible validation: {"min": 0, "max": 10000, "required": true, "allowed_values": ["A","B"]}.';
COMMENT ON COLUMN metric_definitions.category IS 'e.g. fuel, energy, water, production, process, environmental, emission.';

CREATE INDEX idx_metric_definitions_factory ON metric_definitions(factory_id);
CREATE INDEX idx_metric_definitions_org ON metric_definitions(organization_id);
CREATE INDEX idx_metric_definitions_category ON metric_definitions(category);
CREATE INDEX idx_metric_definitions_name ON metric_definitions(name);

-- -----------------------------------------------------------------------------
-- measurements
-- Actual observed values. Append-only. NEVER overwrite or mutate.
-- Supports multiple value types via typed columns.
-- -----------------------------------------------------------------------------
CREATE TABLE measurements (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_definition_id        UUID NOT NULL REFERENCES metric_definitions(id) ON DELETE RESTRICT,
    factory_id                  UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    machine_id                  UUID REFERENCES machines(id) ON DELETE SET NULL,
    process_id                  UUID REFERENCES processes(id) ON DELETE SET NULL,
    data_source_id              UUID REFERENCES data_sources(id) ON DELETE SET NULL,

    -- Observation timing
    recorded_at                 TIMESTAMPTZ NOT NULL,
    ingested_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start                TIMESTAMPTZ,
    period_end                  TIMESTAMPTZ,

    -- Typed value columns (use the one matching metric_definitions.data_type)
    numeric_value               NUMERIC,
    text_value                  TEXT,
    boolean_value               BOOLEAN,
    json_value                  JSONB,

    -- Unit handling
    raw_unit                    TEXT,
    normalized_value            NUMERIC,
    normalized_unit             TEXT,

    -- Quality
    quality_status              quality_status_enum NOT NULL DEFAULT 'RAW',
    quality_flags               JSONB NOT NULL DEFAULT '{}',

    -- Provenance
    entered_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
    notes                       TEXT,

    -- Prevent accidental mutation of raw values
    CONSTRAINT measurement_has_value CHECK (
        num_nonnulls(numeric_value, text_value, boolean_value, json_value) >= 1
    )
);

COMMENT ON TABLE measurements IS 'Append-only time-series of observed values. Raw data is never overwritten. Source of truth for all calculations.';
COMMENT ON COLUMN measurements.numeric_value IS 'Primary value for numeric metrics.';
COMMENT ON COLUMN measurements.normalized_value IS 'Value converted to canonical unit for cross-factory comparison.';
COMMENT ON COLUMN measurements.quality_flags IS '{"out_of_range": false, "missing": false, "interpolated": false, "manual_override": false}';
COMMENT ON COLUMN measurements.period_start IS 'For interval-based readings (e.g., daily totals). NULL for instantaneous readings.';

-- Critical indexes for time-series query performance
CREATE INDEX idx_measurements_factory_time ON measurements(factory_id, recorded_at DESC);
CREATE INDEX idx_measurements_metric ON measurements(metric_definition_id, recorded_at DESC);
CREATE INDEX idx_measurements_machine ON measurements(machine_id, recorded_at DESC) WHERE machine_id IS NOT NULL;
CREATE INDEX idx_measurements_process ON measurements(process_id, recorded_at DESC) WHERE process_id IS NOT NULL;
CREATE INDEX idx_measurements_quality ON measurements(quality_status);

-- =============================================================================
-- LAYER 4: EMISSION LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- emission_types
-- Platform-wide registry of GHG/pollutant types.
-- -----------------------------------------------------------------------------
CREATE TABLE emission_types (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                        TEXT UNIQUE NOT NULL,
    display_name                TEXT,
    global_warming_potential    NUMERIC,
    unit                        TEXT NOT NULL DEFAULT 'kg',
    description                 TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE emission_types IS 'Registry of emission types: CO2, CH4, N2O, NOx, SOx, PM2.5, PM10, etc.';
COMMENT ON COLUMN emission_types.global_warming_potential IS 'GWP100 relative to CO2. CO2=1, CH4=28, N2O=265.';

-- Seed standard emission types
INSERT INTO emission_types (name, display_name, global_warming_potential, unit, description) VALUES
    ('CO2',   'Carbon Dioxide',         1.0,   'kg', 'Primary greenhouse gas from combustion'),
    ('CH4',   'Methane',                28.0,  'kg', 'From fugitive emissions and waste treatment'),
    ('N2O',   'Nitrous Oxide',          265.0, 'kg', 'From combustion and chemical processes'),
    ('NOx',   'Nitrogen Oxides',        NULL,  'kg', 'Air pollutant from high-temperature combustion'),
    ('SOx',   'Sulphur Oxides',         NULL,  'kg', 'From coal and high-sulphur fuel combustion'),
    ('PM2.5', 'Particulate Matter 2.5', NULL,  'kg', 'Fine particulate air pollutant'),
    ('PM10',  'Particulate Matter 10',  NULL,  'kg', 'Coarse particulate air pollutant'),
    ('CO2e',  'CO2 Equivalent',         1.0,   'kg', 'Aggregated GHG expressed as CO2 equivalent');

-- -----------------------------------------------------------------------------
-- emission_sources
-- Physical or logical sources of emissions within a factory.
-- -----------------------------------------------------------------------------
CREATE TABLE emission_sources (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id          UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
    machine_id          UUID REFERENCES machines(id) ON DELETE SET NULL,
    process_id          UUID REFERENCES processes(id) ON DELETE SET NULL,
    name                TEXT NOT NULL,
    source_category     emission_source_category_enum NOT NULL,
    description         TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE emission_sources IS 'Identifiable physical or logical emission source: Furnace-1, Boiler-A, Grid Electricity, Dyeing Process.';

CREATE INDEX idx_emission_sources_factory ON emission_sources(factory_id);

-- -----------------------------------------------------------------------------
-- emission_factors
-- Multiplier: activity quantity -> emission quantity. Versioned.
-- -----------------------------------------------------------------------------
CREATE TABLE emission_factors (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emission_type_id                UUID NOT NULL REFERENCES emission_types(id) ON DELETE RESTRICT,
    activity_metric_definition_id   UUID REFERENCES metric_definitions(id) ON DELETE RESTRICT,
    emission_source_id              UUID REFERENCES emission_sources(id) ON DELETE SET NULL,
    factor_value                    NUMERIC NOT NULL,
    factor_unit                     TEXT NOT NULL,
    methodology                     TEXT,
    reference_source                TEXT,
    valid_from                      DATE NOT NULL,
    valid_until                     DATE,
    version                         INTEGER NOT NULL DEFAULT 1,
    approved_by                     UUID REFERENCES users(id) ON DELETE SET NULL,
    notes                           TEXT,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ef_valid_dates CHECK (valid_until IS NULL OR valid_until > valid_from)
);

COMMENT ON TABLE emission_factors IS 'Versioned conversion factors: e.g. 2.4 kg CO2 per kg coal burned. Referenced immutably by emission_records.';
COMMENT ON COLUMN emission_factors.factor_unit IS 'e.g. kg_CO2/kg_coal, kg_CO2/kWh, kg_CO2/m3_gas.';
COMMENT ON COLUMN emission_factors.methodology IS 'e.g. IPCC 2019, GHG Protocol Scope 2, National Grid EF.';

CREATE INDEX idx_emission_factors_type ON emission_factors(emission_type_id);
CREATE INDEX idx_emission_factors_validity ON emission_factors(valid_from, valid_until);

-- -----------------------------------------------------------------------------
-- emission_records
-- Calculated emission values. Fully traceable to source measurement and factor.
-- -----------------------------------------------------------------------------
CREATE TABLE emission_records (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id              UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    emission_source_id      UUID NOT NULL REFERENCES emission_sources(id) ON DELETE RESTRICT,
    emission_type_id        UUID NOT NULL REFERENCES emission_types(id) ON DELETE RESTRICT,
    emission_factor_id      UUID NOT NULL REFERENCES emission_factors(id) ON DELETE RESTRICT,
    measurement_id          UUID NOT NULL REFERENCES measurements(id) ON DELETE RESTRICT,

    -- Calculation timing
    calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start            TIMESTAMPTZ NOT NULL,
    period_end              TIMESTAMPTZ NOT NULL,

    -- Activity (input side)
    activity_value          NUMERIC NOT NULL,
    activity_unit           TEXT NOT NULL,

    -- Result (output side)
    emission_value          NUMERIC NOT NULL,
    emission_unit           TEXT NOT NULL DEFAULT 'kg',

    -- Full audit trail
    calculation_method      TEXT,
    calculation_inputs      JSONB NOT NULL DEFAULT '{}',
    is_estimated            BOOLEAN NOT NULL DEFAULT FALSE,
    version                 INTEGER NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT er_positive_emission CHECK (emission_value >= 0),
    CONSTRAINT er_valid_period CHECK (period_end > period_start)
);

COMMENT ON TABLE emission_records IS 'Immutable record of a calculated emission. References exact measurement and factor version used.';
COMMENT ON COLUMN emission_records.calculation_inputs IS '{"raw_value": 6900, "factor": 2.4, "formula": "activity_value * factor_value", "notes": "..."}';
COMMENT ON COLUMN emission_records.is_estimated IS 'True if activity value was interpolated due to missing data.';

CREATE INDEX idx_emission_records_factory_period ON emission_records(factory_id, period_start DESC, period_end DESC);
CREATE INDEX idx_emission_records_source ON emission_records(emission_source_id);
CREATE INDEX idx_emission_records_type ON emission_records(emission_type_id);
CREATE INDEX idx_emission_records_measurement ON emission_records(measurement_id);

-- -----------------------------------------------------------------------------
-- contribution_analyses
-- Stored result of emission source contribution breakdown for a period.
-- -----------------------------------------------------------------------------
CREATE TABLE contribution_analyses (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id                  UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    emission_type_id            UUID NOT NULL REFERENCES emission_types(id) ON DELETE RESTRICT,
    analysis_period_start       TIMESTAMPTZ NOT NULL,
    analysis_period_end         TIMESTAMPTZ NOT NULL,
    total_emission_value        NUMERIC NOT NULL,
    total_emission_unit         TEXT NOT NULL DEFAULT 'kg',
    source_contributions        JSONB NOT NULL DEFAULT '[]',
    primary_hotspot_source_id   UUID REFERENCES emission_sources(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT ca_valid_period CHECK (analysis_period_end > analysis_period_start)
);

COMMENT ON TABLE contribution_analyses IS 'Stores breakdown of emissions by source for a factory+period. Primary hotspot identified here.';
COMMENT ON COLUMN contribution_analyses.source_contributions IS '[{"source_id": "...", "source_name": "Furnace", "emission_value": 143640, "percentage": 57.3}, ...]';

CREATE INDEX idx_contribution_analyses_factory ON contribution_analyses(factory_id, analysis_period_start DESC);

-- =============================================================================
-- LAYER 5: FEATURE / ANALYTICS LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- feature_definitions
-- Defines derived metrics (features for ML/analysis).
-- Does NOT replace raw measurements.
-- -----------------------------------------------------------------------------
CREATE TABLE feature_definitions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    factory_id              UUID REFERENCES factories(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    display_name            TEXT,
    description             TEXT,
    formula_type            formula_type_enum NOT NULL,
    formula_definition      JSONB NOT NULL DEFAULT '{}',
    output_unit             TEXT,
    depends_on_metrics      UUID[] DEFAULT '{}',
    version                 INTEGER NOT NULL DEFAULT 1,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (factory_id, name, version)
);

COMMENT ON TABLE feature_definitions IS 'Defines computed features: ratios, rolling averages, trends. Never overwrites measurements.';
COMMENT ON COLUMN feature_definitions.formula_definition IS '{"numerator_metric_id": "uuid", "denominator_metric_id": "uuid"} or {"metric_id": "uuid", "window_hours": 168, "stat": "avg"}.';
COMMENT ON COLUMN feature_definitions.depends_on_metrics IS 'Array of metric_definition UUIDs this feature reads from.';

-- -----------------------------------------------------------------------------
-- feature_values
-- Computed instances of feature_definitions. Traceable to source measurements.
-- -----------------------------------------------------------------------------
CREATE TABLE feature_values (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_definition_id           UUID NOT NULL REFERENCES feature_definitions(id) ON DELETE RESTRICT,
    factory_id                      UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    computed_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start                    TIMESTAMPTZ NOT NULL,
    period_end                      TIMESTAMPTZ NOT NULL,
    value                           NUMERIC,
    unit                            TEXT,
    source_measurement_ids          UUID[] NOT NULL DEFAULT '{}',
    computation_inputs              JSONB NOT NULL DEFAULT '{}',
    feature_definition_version      INTEGER NOT NULL,
    CONSTRAINT fv_valid_period CHECK (period_end > period_start)
);

COMMENT ON TABLE feature_values IS 'Computed feature values. source_measurement_ids preserves lineage to raw measurements.';
COMMENT ON COLUMN feature_values.source_measurement_ids IS 'UUIDs of measurements used in this computation. Enables full audit trace.';
COMMENT ON COLUMN feature_values.computation_inputs IS '{"numerator": 6900, "denominator": 128, "result": 53.91}';

CREATE INDEX idx_feature_values_factory_period ON feature_values(factory_id, period_start DESC);
CREATE INDEX idx_feature_values_definition ON feature_values(feature_definition_id);

-- -----------------------------------------------------------------------------
-- model_registry
-- ML model metadata. Binary artifact stored in object storage (S3/GCS).
-- -----------------------------------------------------------------------------
CREATE TABLE model_registry (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id              UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    emission_source_id      UUID REFERENCES emission_sources(id) ON DELETE SET NULL,
    name                    TEXT NOT NULL,
    model_type              TEXT NOT NULL,
    target_variable         TEXT NOT NULL,
    version                 TEXT NOT NULL,
    training_period_start   TIMESTAMPTZ,
    training_period_end     TIMESTAMPTZ,
    artifact_location       TEXT NOT NULL,
    training_metrics        JSONB NOT NULL DEFAULT '{}',
    hyperparameters         JSONB NOT NULL DEFAULT '{}',
    feature_list            UUID[] DEFAULT '{}',
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    trained_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trained_by              UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (factory_id, name, version)
);

COMMENT ON TABLE model_registry IS 'ML model metadata registry. No binary blobs stored here; artifact_location points to object storage.';
COMMENT ON COLUMN model_registry.model_type IS 'e.g. random_forest, gradient_boosting, linear_regression, xgboost.';
COMMENT ON COLUMN model_registry.artifact_location IS 'Path to serialized model: s3://bucket/models/factory_id/model_v1.pkl';
COMMENT ON COLUMN model_registry.feature_list IS 'Array of feature_definition UUIDs used as model inputs.';

-- -----------------------------------------------------------------------------
-- model_evaluations
-- Performance evaluation records per model version and evaluation period.
-- -----------------------------------------------------------------------------
CREATE TABLE model_evaluations (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id                    UUID NOT NULL REFERENCES model_registry(id) ON DELETE CASCADE,
    evaluated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    evaluation_period_start     TIMESTAMPTZ,
    evaluation_period_end       TIMESTAMPTZ,
    metrics                     JSONB NOT NULL DEFAULT '{}',
    notes                       TEXT
);

COMMENT ON TABLE model_evaluations IS 'Stores evaluation results for a model version: R2, MAE, MAPE, RMSE, etc.';
COMMENT ON COLUMN model_evaluations.metrics IS '{"r2": 0.94, "rmse": 12.3, "mae": 9.1, "mape": 3.4}';

-- -----------------------------------------------------------------------------
-- factor_contributions
-- ML/statistical attribution: which features explain which emission outputs.
-- -----------------------------------------------------------------------------
CREATE TABLE factor_contributions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id              UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    emission_source_id      UUID NOT NULL REFERENCES emission_sources(id) ON DELETE RESTRICT,
    emission_type_id        UUID NOT NULL REFERENCES emission_types(id) ON DELETE RESTRICT,
    model_run_id            UUID NOT NULL REFERENCES model_registry(id) ON DELETE RESTRICT,
    feature_definition_id   UUID NOT NULL REFERENCES feature_definitions(id) ON DELETE RESTRICT,
    analysis_period_start   TIMESTAMPTZ NOT NULL,
    analysis_period_end     TIMESTAMPTZ NOT NULL,
    importance_score        NUMERIC NOT NULL,
    importance_method       importance_method_enum NOT NULL,
    direction               TEXT,
    rank                    INTEGER NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fc_valid_direction CHECK (direction IN ('positive', 'negative', 'neutral') OR direction IS NULL)
);

COMMENT ON TABLE factor_contributions IS 'Attribution result: which operational features statistically explain emission outputs for a source.';
COMMENT ON COLUMN factor_contributions.importance_score IS 'Normalized importance: 0-1 for permutation/SHAP, or raw coefficient for regression.';
COMMENT ON COLUMN factor_contributions.direction IS 'positive = higher feature value -> higher emission. negative = higher feature value -> lower emission.';

CREATE INDEX idx_factor_contributions_factory ON factor_contributions(factory_id, analysis_period_start DESC);
CREATE INDEX idx_factor_contributions_source ON factor_contributions(emission_source_id);

-- =============================================================================
-- LAYER 6: ALTERNATIVE / RECOMMENDATION LAYER
-- =============================================================================

-- -----------------------------------------------------------------------------
-- alternatives
-- Platform-level knowledge base of possible emission reduction interventions.
-- Not factory-specific; applicability is determined by alternative_applicability.
-- -----------------------------------------------------------------------------
CREATE TABLE alternatives (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    TEXT NOT NULL,
    description             TEXT,
    category                alternative_category_enum NOT NULL,
    target_emission_types   TEXT[] DEFAULT '{}',
    summary                 TEXT,
    reference_source        TEXT,
    version                 INTEGER NOT NULL DEFAULT 1,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alternatives IS 'Global knowledge base of emission reduction interventions. Shared across all organizations.';
COMMENT ON COLUMN alternatives.target_emission_types IS 'Emission type names this alternative addresses: ["CO2", "NOx"].';

-- -----------------------------------------------------------------------------
-- alternative_applicability
-- Domain rules: when is an alternative applicable?
-- -----------------------------------------------------------------------------
CREATE TABLE alternative_applicability (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alternative_id              UUID NOT NULL REFERENCES alternatives(id) ON DELETE CASCADE,
    industry_types              TEXT[],
    process_types               TEXT[],
    machine_types               TEXT[],
    emission_source_categories  emission_source_category_enum[],
    required_metrics            TEXT[],
    operating_conditions        JSONB NOT NULL DEFAULT '{}',
    exclusion_conditions        JSONB NOT NULL DEFAULT '{}',
    notes                       TEXT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alternative_applicability IS 'Domain rules that determine when an alternative can be applied to a factory/process/machine.';
COMMENT ON COLUMN alternative_applicability.industry_types IS 'NULL = applicable to all industries. Specified = only those industries.';
COMMENT ON COLUMN alternative_applicability.operating_conditions IS '{"min_temperature_c": 800, "current_fuel": "coal", "required_grid_access": true}.';
COMMENT ON COLUMN alternative_applicability.exclusion_conditions IS 'Conditions that disqualify: {"fuel_type": "gas"} means already using gas, skip this.';

-- -----------------------------------------------------------------------------
-- alternative_impacts
-- Quantified expected outcomes of applying an alternative. Versioned.
-- -----------------------------------------------------------------------------
CREATE TABLE alternative_impacts (
    id                              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alternative_id                  UUID NOT NULL REFERENCES alternatives(id) ON DELETE CASCADE,
    emission_type_id                UUID NOT NULL REFERENCES emission_types(id) ON DELETE RESTRICT,
    reduction_min_pct               NUMERIC NOT NULL,
    reduction_typical_pct           NUMERIC NOT NULL,
    reduction_max_pct               NUMERIC NOT NULL,
    capex_range_low                 NUMERIC,
    capex_range_high                NUMERIC,
    capex_currency                  TEXT DEFAULT 'USD',
    opex_change_pct                 NUMERIC,
    payback_years_typical           NUMERIC,
    implementation_time_months      NUMERIC,
    feasibility_score               NUMERIC,
    feasibility_notes               TEXT,
    technical_readiness_level       INTEGER,
    assumptions                     JSONB NOT NULL DEFAULT '{}',
    reference_source                TEXT,
    valid_from                      DATE NOT NULL,
    valid_until                     DATE,
    version                         INTEGER NOT NULL DEFAULT 1,
    created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ai_reduction_range CHECK (
        reduction_min_pct <= reduction_typical_pct AND
        reduction_typical_pct <= reduction_max_pct
    ),
    CONSTRAINT ai_feasibility_range CHECK (
        feasibility_score IS NULL OR (feasibility_score >= 0 AND feasibility_score <= 1)
    ),
    CONSTRAINT ai_trl_range CHECK (
        technical_readiness_level IS NULL OR
        (technical_readiness_level >= 1 AND technical_readiness_level <= 9)
    )
);

COMMENT ON TABLE alternative_impacts IS 'Quantified impact estimates for an alternative: emission reduction %, CAPEX, OPEX, payback, feasibility.';
COMMENT ON COLUMN alternative_impacts.technical_readiness_level IS 'TRL 1-9 scale: 9=mature technology, 1=basic research.';
COMMENT ON COLUMN alternative_impacts.assumptions IS '{"baseline_coal_price_usd_per_tonne": 120, "grid_carbon_intensity": 0.65}';

-- -----------------------------------------------------------------------------
-- recommendations
-- Header record for a recommendation event targeting a factory/period.
-- -----------------------------------------------------------------------------
CREATE TABLE recommendations (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    factory_id                  UUID NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
    contribution_analysis_id    UUID NOT NULL REFERENCES contribution_analyses(id) ON DELETE RESTRICT,
    emission_source_id          UUID NOT NULL REFERENCES emission_sources(id) ON DELETE RESTRICT,
    emission_type_id            UUID NOT NULL REFERENCES emission_types(id) ON DELETE RESTRICT,
    analysis_period_start       TIMESTAMPTZ NOT NULL,
    analysis_period_end         TIMESTAMPTZ NOT NULL,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by                  UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE recommendations IS 'Header for a recommendation event. One per factory/source/period analysis. Details in recommendation_alternatives.';

-- -----------------------------------------------------------------------------
-- recommendation_alternatives
-- Each ranked alternative within a recommendation, with full scoring detail.
-- -----------------------------------------------------------------------------
CREATE TABLE recommendation_alternatives (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id           UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    alternative_id              UUID NOT NULL REFERENCES alternatives(id) ON DELETE RESTRICT,
    alternative_impact_id       UUID NOT NULL REFERENCES alternative_impacts(id) ON DELETE RESTRICT,
    rank                        INTEGER NOT NULL,
    estimated_reduction_pct     NUMERIC NOT NULL,
    estimated_reduction_kg      NUMERIC,
    estimated_capex             NUMERIC,
    estimated_capex_currency    TEXT DEFAULT 'USD',
    estimated_payback_years     NUMERIC,
    feasibility_score           NUMERIC,
    mcda_score                  NUMERIC NOT NULL,
    mcda_weights                JSONB NOT NULL DEFAULT '{}',
    scoring_breakdown           JSONB NOT NULL DEFAULT '{}',
    is_top_recommendation       BOOLEAN NOT NULL DEFAULT FALSE,
    reasoning                   TEXT,
    factor_contribution_ids     UUID[] DEFAULT '{}',
    UNIQUE (recommendation_id, rank)
);

COMMENT ON TABLE recommendation_alternatives IS 'Each alternative ranked within a recommendation, with MCDA scores and full justification.';
COMMENT ON COLUMN recommendation_alternatives.mcda_weights IS '{"emission_reduction": 0.4, "cost_effectiveness": 0.3, "feasibility": 0.2, "implementation_time": 0.1}';
COMMENT ON COLUMN recommendation_alternatives.scoring_breakdown IS '{"emission_reduction_score": 0.82, "cost_score": 0.71, "feasibility_score": 0.90}';
COMMENT ON COLUMN recommendation_alternatives.factor_contribution_ids IS 'factor_contribution UUIDs that informed this recommendation.';

-- =============================================================================
-- AUDIT / VERSIONING SUPPORT
-- =============================================================================

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    factory_id      UUID REFERENCES factories(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    table_name      TEXT NOT NULL,
    record_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Append-only audit trail. Auditors can trace any data modification to a user and timestamp.';

CREATE INDEX idx_audit_log_factory ON audit_log(factory_id, created_at DESC) WHERE factory_id IS NOT NULL;
CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);

-- =============================================================================
-- TRIGGERS: updated_at auto-maintenance
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_organizations
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_factories
    BEFORE UPDATE ON factories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_machines
    BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_metric_definitions
    BEFORE UPDATE ON metric_definitions
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_alternatives
    BEFORE UPDATE ON alternatives
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE contribution_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE factor_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_alternatives ENABLE ROW LEVEL SECURITY;

-- Helper: current user's organization IDs
CREATE OR REPLACE FUNCTION get_my_organization_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY(
        SELECT DISTINCT organization_id
        FROM user_organization_roles
        WHERE user_id = auth.uid()
          AND (expires_at IS NULL OR expires_at > NOW())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: current user's factory IDs
CREATE OR REPLACE FUNCTION get_my_factory_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY(
        SELECT DISTINCT f.id
        FROM factories f
        JOIN user_organization_roles uor ON uor.organization_id = f.organization_id
        WHERE uor.user_id = auth.uid()
          AND (uor.factory_id IS NULL OR uor.factory_id = f.id)
          AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY org_visibility ON organizations
    FOR SELECT USING (id = ANY(get_my_organization_ids()));

CREATE POLICY factory_visibility ON factories
    FOR SELECT USING (id = ANY(get_my_factory_ids()));

CREATE POLICY measurement_visibility ON measurements
    FOR SELECT USING (factory_id = ANY(get_my_factory_ids()));

CREATE POLICY measurement_insert ON measurements
    FOR INSERT WITH CHECK (
        factory_id = ANY(get_my_factory_ids())
        AND EXISTS (
            SELECT 1 FROM user_organization_roles uor
            JOIN roles r ON r.id = uor.role_id
            WHERE uor.user_id = auth.uid()
              AND r.name IN ('PLATFORM_ADMIN', 'ORG_ADMIN', 'FACTORY_MANAGER', 'PLANT_OPERATOR', 'SUSTAINABILITY_OFFICER')
        )
    );

CREATE POLICY recommendation_visibility ON recommendations
    FOR SELECT USING (factory_id = ANY(get_my_factory_ids()));

CREATE POLICY emission_record_visibility ON emission_records
    FOR SELECT USING (factory_id = ANY(get_my_factory_ids()));

-- =============================================================================
-- USEFUL VIEWS
-- =============================================================================

-- Latest validated measurements per metric per factory
CREATE VIEW latest_measurements AS
SELECT DISTINCT ON (factory_id, metric_definition_id)
    m.*,
    md.name AS metric_name,
    md.unit AS metric_unit,
    md.category AS metric_category
FROM measurements m
JOIN metric_definitions md ON md.id = m.metric_definition_id
WHERE m.quality_status IN ('VALIDATED', 'RAW')
ORDER BY factory_id, metric_definition_id, recorded_at DESC;

-- Emission hotspot summary per factory
CREATE VIEW emission_hotspot_summary AS
SELECT
    ca.factory_id,
    f.name AS factory_name,
    et.name AS emission_type,
    ca.analysis_period_start,
    ca.analysis_period_end,
    ca.total_emission_value,
    ca.total_emission_unit,
    es.name AS primary_hotspot,
    es.source_category AS hotspot_category,
    ca.source_contributions
FROM contribution_analyses ca
JOIN factories f ON f.id = ca.factory_id
JOIN emission_types et ON et.id = ca.emission_type_id
LEFT JOIN emission_sources es ON es.id = ca.primary_hotspot_source_id;

-- Top recommendation per factory/source/type (latest)
CREATE VIEW top_recommendations AS
SELECT DISTINCT ON (r.factory_id, r.emission_source_id, r.emission_type_id)
    r.id AS recommendation_id,
    r.factory_id,
    f.name AS factory_name,
    es.name AS emission_source,
    et.name AS emission_type,
    r.analysis_period_start,
    r.analysis_period_end,
    ra.rank,
    a.name AS top_alternative,
    a.category AS alternative_category,
    ra.estimated_reduction_pct,
    ra.estimated_capex,
    ra.feasibility_score,
    ra.mcda_score,
    ra.reasoning
FROM recommendations r
JOIN factories f ON f.id = r.factory_id
JOIN emission_sources es ON es.id = r.emission_source_id
JOIN emission_types et ON et.id = r.emission_type_id
JOIN recommendation_alternatives ra ON ra.recommendation_id = r.id AND ra.is_top_recommendation = TRUE
JOIN alternatives a ON a.id = ra.alternative_id
ORDER BY r.factory_id, r.emission_source_id, r.emission_type_id, r.created_at DESC;
