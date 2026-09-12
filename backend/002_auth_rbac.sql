BEGIN;

DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,
    category        TEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE permissions IS 'Atomic, checkable permission codes. category is the resource type (matches PostgREST/table groupings).';

CREATE TABLE role_permissions (
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE role_permissions IS 'Many-to-many: which permissions a role grants. New roles use this; legacy roles keep working via roles.permissions wildcard fallback in fn_user_has_permission.';

INSERT INTO permissions (code, category, description) VALUES
    ('measurement:view',            'measurement',    'View raw/aggregated measurement data'),
    ('measurement:write',           'measurement',    'Enter or upload measurement data'),
    ('model:predict',               'model',          'Trigger the emission/ML analysis pipeline'),
    ('model:view_drivers',          'model',          'View ML attribution, driver analysis, anomalies'),
    ('recommendation:view',         'recommendation', 'View recommended actions'),
    ('recommendation:view_operational', 'recommendation', 'View operational (non-financial) recommended actions only'),
    ('recommendation:view_compliance',  'recommendation', 'View compliance-related recommended actions only'),
    ('recommendation:evaluate',     'recommendation', 'Approve / reject / mark a recommendation implemented'),
    ('recommendation:create',       'recommendation', 'Author a new recommendation or what-if scenario'),
    ('recommendation:compare',      'recommendation', 'Compare recommendations/scenarios across factories'),
    ('scenario:create',             'scenario',       'Create what-if / decarbonization scenario models'),
    ('cost:view',                   'financial',      'View CAPEX/OPEX/cost and savings figures'),
    ('compliance:view',             'compliance',     'View compliance status, thresholds, violations'),
    ('industry:aggregate:view',     'compliance',     'View anonymized industry-wide aggregate trends across organizations'),
    ('report:export',               'report',         'Export reports (PDF/CSV)'),
    ('alert:view',                  'operational',    'View live/periodic operational alerts'),
    ('org:manage_users',            'admin',          'Invite/remove users and assign roles within an organization'),
    ('factory:manage',              'admin',          'Create/edit factories within an organization'),
    ('audit:view',                  'admin',          'View audit log entries');

INSERT INTO roles (name, description, permissions) VALUES
    ('SME_OWNER',                 'SME / Factory Owner — full ownership view of their organization', '[]'),
    ('FACTORY_OPERATOR',          'Operates and monitors an assigned factory/process',                '[]'),
    ('SUSTAINABILITY_CONSULTANT', 'Advises multiple client organizations on decarbonization',          '[]'),
    ('INDUSTRY_REGULATOR',        'Cross-organization compliance monitoring',                          '[]')
ON CONFLICT (name) DO NOTHING;

WITH role_perms (role_name, perm_code) AS (
    VALUES
    ('SME_OWNER', 'measurement:view'), ('SME_OWNER', 'measurement:write'),
    ('SME_OWNER', 'model:predict'), ('SME_OWNER', 'model:view_drivers'),
    ('SME_OWNER', 'recommendation:view'), ('SME_OWNER', 'recommendation:evaluate'),
    ('SME_OWNER', 'cost:view'), ('SME_OWNER', 'report:export'),
    ('SME_OWNER', 'org:manage_users'), ('SME_OWNER', 'factory:manage'), ('SME_OWNER', 'audit:view'),

    ('FACTORY_OPERATOR', 'measurement:view'), ('FACTORY_OPERATOR', 'measurement:write'),
    ('FACTORY_OPERATOR', 'model:predict'), ('FACTORY_OPERATOR', 'model:view_drivers'),
    ('FACTORY_OPERATOR', 'recommendation:view_operational'), ('FACTORY_OPERATOR', 'alert:view'),

    ('SUSTAINABILITY_CONSULTANT', 'measurement:view'),
    ('SUSTAINABILITY_CONSULTANT', 'model:predict'), ('SUSTAINABILITY_CONSULTANT', 'model:view_drivers'),
    ('SUSTAINABILITY_CONSULTANT', 'recommendation:view'), ('SUSTAINABILITY_CONSULTANT', 'recommendation:compare'),
    ('SUSTAINABILITY_CONSULTANT', 'recommendation:create'), ('SUSTAINABILITY_CONSULTANT', 'scenario:create'),
    ('SUSTAINABILITY_CONSULTANT', 'cost:view'), ('SUSTAINABILITY_CONSULTANT', 'report:export'),

    ('INDUSTRY_REGULATOR', 'measurement:view'), ('INDUSTRY_REGULATOR', 'compliance:view'),
    ('INDUSTRY_REGULATOR', 'recommendation:view_compliance'),
    ('INDUSTRY_REGULATOR', 'industry:aggregate:view'), ('INDUSTRY_REGULATOR', 'audit:view')
)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perms rp
JOIN roles r ON r.name = rp.role_name
JOIN permissions p ON p.code = rp.perm_code
ON CONFLICT DO NOTHING;

COMMIT;