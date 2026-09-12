BEGIN;

-- Jurisdiction grants are intentionally separate from organization memberships.
-- A regulator can therefore monitor every organization/factory in an assigned jurisdiction.
CREATE TABLE IF NOT EXISTS user_jurisdictions (
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jurisdiction  TEXT NOT NULL,
    granted_by    UUID REFERENCES users(id),
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, jurisdiction)
);

CREATE INDEX IF NOT EXISTS idx_user_jurisdictions_user ON user_jurisdictions(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_jurisdiction ON organizations((COALESCE(settings->>'jurisdiction', country)));

CREATE OR REPLACE FUNCTION fn_user_has_permission(
    requested_permission TEXT,
    requested_organization UUID DEFAULT NULL,
    requested_factory UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM user_organization_roles uor
        JOIN roles r ON r.id = uor.role_id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        LEFT JOIN permissions p ON p.id = rp.permission_id
        WHERE uor.user_id = auth.uid()
          AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
          AND (
              p.code = requested_permission
              OR p.code = '*'
              OR p.code = split_part(requested_permission, ':', 1) || ':*'
              OR r.permissions @> to_jsonb(ARRAY['*']::TEXT[])
              OR r.permissions @> to_jsonb(ARRAY[requested_permission]::TEXT[])
              OR (requested_permission = 'measurement:view' AND r.permissions @> to_jsonb(ARRAY['read:measurements']::TEXT[]))
              OR (requested_permission = 'measurement:write' AND r.permissions @> to_jsonb(ARRAY['write:measurements']::TEXT[]))
              OR (requested_permission = 'recommendation:evaluate' AND r.permissions @> to_jsonb(ARRAY['approve:recommendations']::TEXT[]))
              OR (requested_permission = 'recommendation:create' AND r.permissions @> to_jsonb(ARRAY['write:recommendations']::TEXT[]))
              OR (requested_permission = 'report:export' AND r.permissions @> to_jsonb(ARRAY['export:reports']::TEXT[]))
          )
          AND (
              requested_organization IS NULL
              OR uor.organization_id = requested_organization
              OR (
                  r.name = 'INDUSTRY_REGULATOR'
                  AND EXISTS (
                      SELECT 1
                      FROM user_jurisdictions uj
                      JOIN organizations org ON org.id = requested_organization
                      WHERE uj.user_id = auth.uid()
                        AND lower(uj.jurisdiction) = lower(COALESCE(org.settings->>'jurisdiction', org.country))
                  )
              )
          )
          AND (
              requested_factory IS NULL
              OR uor.factory_id IS NULL
              OR uor.factory_id = requested_factory
              OR (
                  r.name = 'INDUSTRY_REGULATOR'
                  AND EXISTS (
                      SELECT 1
                      FROM user_jurisdictions uj
                      JOIN factories fac ON fac.id = requested_factory
                      JOIN organizations org ON org.id = fac.organization_id
                      WHERE uj.user_id = auth.uid()
                        AND lower(uj.jurisdiction) = lower(COALESCE(org.settings->>'jurisdiction', org.country))
                  )
              )
          )
    )
    OR (
        requested_organization IS NOT NULL
        AND requested_factory IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM user_organization_roles uor
            JOIN roles r ON r.id = uor.role_id
            JOIN role_permissions rp ON rp.role_id = r.id
            JOIN permissions p ON p.id = rp.permission_id
            JOIN factories f ON f.id = requested_factory
            JOIN organizations org ON org.id = f.organization_id
            JOIN user_jurisdictions uj ON uj.user_id = auth.uid()
            WHERE r.name = 'INDUSTRY_REGULATOR'
              AND p.code = requested_permission
              AND f.organization_id = requested_organization
              AND lower(uj.jurisdiction) = lower(COALESCE(org.settings->>'jurisdiction', org.country))
        )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_factory_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY(
        SELECT DISTINCT f.id
        FROM factories f
        JOIN organizations factory_org ON factory_org.id = f.organization_id
        LEFT JOIN user_organization_roles uor
          ON uor.organization_id = f.organization_id
         AND uor.user_id = auth.uid()
         AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
        WHERE (
            (uor.id IS NOT NULL AND (uor.factory_id IS NULL OR uor.factory_id = f.id))
            OR EXISTS (
                SELECT 1
                FROM user_jurisdictions uj
                JOIN roles regulator_role ON regulator_role.name = 'INDUSTRY_REGULATOR'
                JOIN user_organization_roles regulator_membership
                  ON regulator_membership.user_id = uj.user_id
                 AND regulator_membership.role_id = regulator_role.id
                WHERE uj.user_id = auth.uid()
                  AND lower(uj.jurisdiction) = lower(COALESCE(factory_org.settings->>'jurisdiction', factory_org.country))
            )
        )
        AND fn_user_has_permission('measurement:view', f.organization_id, f.id)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

COMMIT;
