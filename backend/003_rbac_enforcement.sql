BEGIN;

-- Permission-aware access helpers. Membership scope remains the hard boundary;
-- permissions decide what the member may do inside that scope.
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
        JOIN factories f ON f.organization_id = uor.organization_id
        WHERE uor.user_id = auth.uid()
          AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
          AND (requested_organization IS NULL OR uor.organization_id = requested_organization)
          AND (requested_factory IS NULL OR f.id = requested_factory)
          AND (uor.factory_id IS NULL OR uor.factory_id = f.id)
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
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_factory_ids()
RETURNS UUID[] AS $$
    SELECT ARRAY(
        SELECT DISTINCT f.id
        FROM factories f
        JOIN user_organization_roles uor ON uor.organization_id = f.organization_id
        WHERE uor.user_id = auth.uid()
          AND (uor.factory_id IS NULL OR uor.factory_id = f.id)
          AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
          AND fn_user_has_permission('measurement:view', f.organization_id, f.id)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS factory_visibility ON factories;
CREATE POLICY factory_visibility ON factories
    FOR SELECT USING (
        id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('measurement:view', organization_id, id)
    );

DROP POLICY IF EXISTS measurement_visibility ON measurements;
CREATE POLICY measurement_visibility ON measurements
    FOR SELECT USING (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('measurement:view', NULL, factory_id)
    );

DROP POLICY IF EXISTS measurement_insert ON measurements;
CREATE POLICY measurement_insert ON measurements
    FOR INSERT WITH CHECK (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('measurement:write', NULL, factory_id)
    );

DROP POLICY IF EXISTS emission_record_visibility ON emission_records;
CREATE POLICY emission_record_visibility ON emission_records
    FOR SELECT USING (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('measurement:view', NULL, factory_id)
    );

DROP POLICY IF EXISTS recommendation_visibility ON recommendations;
CREATE POLICY recommendation_visibility ON recommendations
    FOR SELECT USING (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('recommendation:view', NULL, factory_id)
    );

DROP POLICY IF EXISTS contribution_visibility ON contribution_analyses;
CREATE POLICY contribution_visibility ON contribution_analyses
    FOR SELECT USING (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('model:view_drivers', NULL, factory_id)
    );

DROP POLICY IF EXISTS feature_visibility ON feature_values;
CREATE POLICY feature_visibility ON feature_values
    FOR SELECT USING (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('model:view_drivers', NULL, factory_id)
    );

DROP POLICY IF EXISTS factor_contribution_visibility ON factor_contributions;
CREATE POLICY factor_contribution_visibility ON factor_contributions
    FOR SELECT USING (
        factory_id = ANY(get_my_factory_ids())
        AND fn_user_has_permission('model:view_drivers', NULL, factory_id)
    );

COMMIT;
