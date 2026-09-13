"""Supabase Auth and database-backed RBAC endpoints."""

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
PROJECT_URL = os.getenv("PROJECT_URL", "").rstrip("/")
PUBLISHABLE_KEY = os.getenv("PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication & RBAC"])


class CurrentUser(BaseModel):
    id: str
    email: Optional[str] = None
    user_metadata: Dict[str, Any] = Field(default_factory=dict)


class MembershipCreate(BaseModel):
    user_id: str
    role_id: str
    factory_id: Optional[str] = None
    expires_at: Optional[datetime] = None


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def _bearer_token(request: Request) -> str:
    value = request.headers.get("Authorization", "")
    scheme, _, token = value.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    return token


# Every authenticated request used to make a live network round-trip to
# Supabase's /auth/v1/user endpoint to validate the bearer token — a page
# firing several API calls (e.g. one per facility) paid that latency on
# each call, serially. The access token itself is opaque and doesn't change
# for the life of the session, so it's safe to cache the validated identity
# for a short window instead of re-checking with Supabase every time.
_USER_CACHE_TTL_SECONDS = 60
_user_cache: Dict[str, tuple] = {}


def get_current_user(request: Request) -> CurrentUser:
    """Validate a Supabase access token through Supabase Auth's user endpoint."""
    if not PROJECT_URL or not PUBLISHABLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase Auth is not configured")

    token = _bearer_token(request)

    cached = _user_cache.get(token)
    if cached and cached[0] > time.time():
        return cached[1]

    auth_request = urllib.request.Request(
        f"{PROJECT_URL}/auth/v1/user",
        headers={
            "apikey": PUBLISHABLE_KEY,
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(auth_request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError) as exc:
        _user_cache.pop(token, None)
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase access token") from exc

    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Supabase token did not identify a user")
    user = CurrentUser(id=user_id, email=payload.get("email"), user_metadata=payload.get("user_metadata") or {})
    _user_cache[token] = (time.time() + _USER_CACHE_TTL_SECONDS, user)
    return user


def metadata_role(user: CurrentUser) -> Optional[str]:
    """The role the user picked at signup, stored in Supabase user_metadata.

    Signup/login (frontend/app/auth/page.js) only ever creates a Supabase
    Auth user — it never inserts a `user_organization_roles` row in
    Postgres. So any account that wasn't separately seeded via
    backend/seed_users.py has NO database-side role at all, and DB-driven
    scoping (see `_user_has_any_membership`) has nothing to find. This is
    the fallback signal for that case.
    """
    return user.user_metadata.get("user_category") or user.user_metadata.get("role")


FACTORY_MANAGER_ROLES = {"SME_OWNER", "FACTORY_OPERATOR", "INDUSTRY_REGULATOR"}


def require_factory_manager(request: Request) -> Dict[str, Any]:
    """
    Gate for factory lifecycle actions (create-via-CSV, delete). Every role
    except SUSTAINABILITY_CONSULTANT may manage factories — consultants get
    full read visibility across every factory but never lifecycle control.
    Unlike the read-path helpers, this always requires a valid session:
    creating/deleting data isn't something we leave open for logged-out
    callers the way GETs are (for demo/test-suite convenience).
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to manage factories.")
    user = get_current_user(request)

    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT r.name AS role_name, uor.organization_id, uor.factory_id
                FROM user_organization_roles uor
                JOIN roles r ON r.id = uor.role_id
                WHERE uor.user_id = %s
                  AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
                ORDER BY uor.granted_at DESC
                LIMIT 1;
                """,
                (user.id,),
            )
            row = cur.fetchone()
    finally:
        conn.close()

    role = row["role_name"] if row else metadata_role(user)
    if role == "SUSTAINABILITY_CONSULTANT":
        raise HTTPException(
            status_code=403,
            detail="Sustainability Consultants have read-only access across all factories and cannot manage factory details.",
        )
    if role not in FACTORY_MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Your role does not permit managing factories.")

    return {
        "user": user,
        "role": role,
        "organization_id": row["organization_id"] if row else None,
        "assigned_factory_id": row["factory_id"] if row else None,
    }


def _permission_rows(user_id: str, organization_id: Optional[str] = None, factory_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DISTINCT p.code, p.category, p.description,
                       r.id AS role_id, r.name AS role_name,
                       uor.organization_id, uor.factory_id
                FROM user_organization_roles uor
                JOIN roles r ON r.id = uor.role_id
                LEFT JOIN role_permissions rp ON rp.role_id = r.id
                LEFT JOIN permissions p ON p.id = rp.permission_id
                WHERE uor.user_id = %s
                  AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
                  AND (%s IS NULL OR uor.organization_id = %s)
                  AND (%s IS NULL OR uor.factory_id IS NULL OR uor.factory_id = %s)
                ORDER BY p.code NULLS LAST;
                """,
                (user_id, organization_id, organization_id, factory_id, factory_id),
            )
            rows = [dict(row) for row in cur.fetchall()]

            # Preserve legacy roles.permissions wildcard support from schema.sql.
            cur.execute(
                """
                SELECT r.permissions
                FROM user_organization_roles uor
                JOIN roles r ON r.id = uor.role_id
                WHERE uor.user_id = %s
                  AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
                  AND (%s IS NULL OR uor.organization_id = %s)
                  AND (%s IS NULL OR uor.factory_id IS NULL OR uor.factory_id = %s);
                """,
                (user_id, organization_id, organization_id, factory_id, factory_id),
            )
            legacy = [permission for row in cur.fetchall() for permission in (row["permissions"] or [])]

        known = {row["code"] for row in rows if row.get("code")}
        for code in legacy:
            if code not in known:
                rows.append({"code": code, "category": code.split(":", 1)[0], "description": "Legacy role permission"})
        return rows
    finally:
        conn.close()


LEGACY_PERMISSION_ALIASES: Dict[str, str] = {
    "measurement:view": "read:measurements",
    "measurement:write": "write:measurements",
    "model:predict": "read:*",
    "model:view_drivers": "read:*",
    "recommendation:view": "read:*",
    "recommendation:evaluate": "approve:recommendations",
    "recommendation:create": "write:recommendations",
    "recommendation:compare": "read:*",
    "report:export": "export:reports",
    "org:manage_users": "manage:users",
}


def _has_permission(permissions: set, permission: str) -> bool:
    # FACTORY_OPERATOR is granted recommendation:view_operational (002_auth_rbac.sql)
    # rather than plain recommendation:view — it's the same underlying data
    # (GET /factories/{id}/recommendations), just a role that should see an
    # operational subset of it rather than being locked out entirely.
    if permission == "recommendation:view" and "recommendation:view_operational" in permissions:
        return True
    return (
        permission in permissions
        or LEGACY_PERMISSION_ALIASES.get(permission) in permissions
        or "*" in permissions
        or f"{permission.split(':', 1)[0]}:*" in permissions
    )


def require_permission(permission: str):
    def dependency(request: Request, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        organization_id = request.query_params.get("organization_id")
        factory_id = request.query_params.get("factory_id")
        permissions = {row["code"] for row in _permission_rows(user.id, organization_id, factory_id)}
        if not _has_permission(permissions, permission):
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
        return user
    return dependency


def _resolve_factory_organization(factory_id: str) -> Optional[str]:
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT organization_id FROM factories WHERE id::text = %s OR code = %s;",
                (factory_id, factory_id),
            )
            row = cur.fetchone()
            return row["organization_id"] if row else None
    finally:
        conn.close()


def _user_has_any_membership(user_id: str) -> bool:
    """True if this user has ever been granted a role via user_organization_roles."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM user_organization_roles WHERE user_id = %s LIMIT 1;", (user_id,))
            return cur.fetchone() is not None
    finally:
        conn.close()


# Mirrors the role_permissions seeded in backend/002_auth_rbac.sql. Used only
# as a fallback for accounts with zero user_organization_roles rows (i.e.
# never run through seed_users.py) — for those we have no DB permission set
# to look up, so we trust the role declared at signup instead.
METADATA_FALLBACK_PERMISSIONS: Dict[str, set] = {
    "SME_OWNER": {
        "measurement:view", "measurement:write", "model:predict", "model:view_drivers",
        "recommendation:view", "recommendation:evaluate", "cost:view", "report:export",
        "org:manage_users", "factory:manage", "audit:view",
    },
    "FACTORY_OPERATOR": {
        "measurement:view", "measurement:write", "model:predict", "model:view_drivers",
        "recommendation:view_operational", "alert:view",
    },
    "SUSTAINABILITY_CONSULTANT": {
        "measurement:view", "model:predict", "model:view_drivers", "recommendation:view",
        "recommendation:compare", "recommendation:create", "scenario:create", "cost:view",
        "report:export",
    },
    "INDUSTRY_REGULATOR": {
        "measurement:view", "compliance:view", "recommendation:view_compliance",
        "industry:aggregate:view", "audit:view",
    },
}


def _has_role_anywhere(user_id: str, role_name: str, permission: str) -> bool:
    """
    True if the user holds `role_name` in ANY organization and that role
    grants `permission` — used for roles like SUSTAINABILITY_CONSULTANT that
    are meant to see across every organization's factories rather than being
    confined to the org(s) they hold a membership row in.
    """
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT DISTINCT p.code, r.permissions AS legacy_permissions
                FROM user_organization_roles uor
                JOIN roles r ON r.id = uor.role_id
                LEFT JOIN role_permissions rp ON rp.role_id = r.id
                LEFT JOIN permissions p ON p.id = rp.permission_id
                WHERE uor.user_id = %s
                  AND r.name = %s
                  AND (uor.expires_at IS NULL OR uor.expires_at > NOW());
                """,
                (user_id, role_name),
            )
            rows = cur.fetchall()
        if not rows:
            return False
        codes = {row["code"] for row in rows if row.get("code")}
        for row in rows:
            codes.update(row.get("legacy_permissions") or [])
        return _has_permission(codes, permission)
    finally:
        conn.close()


def authorize_factory_access(
    request: Request, factory_id: str, permission: str = "measurement:view"
) -> Optional[CurrentUser]:
    """
    Enforces role/org/jurisdiction-scoped access to a factory's data.

    A request carrying a Supabase bearer token is fully checked against
    that user's `user_organization_roles` (and, for INDUSTRY_REGULATOR,
    `user_jurisdictions`) grants for the factory's organization — a 403 is
    raised if the caller's role doesn't grant `permission` for this factory.
    A request with no bearer token at all falls through unauthenticated
    (returns None) so the existing demo/test-suite flows that never log in
    keep working; only logged-in callers are scoped.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return None

    user = get_current_user(request)
    organization_id = _resolve_factory_organization(factory_id)
    if organization_id is None:
        raise HTTPException(status_code=404, detail="Factory not found")

    permissions = {row["code"] for row in _permission_rows(user.id, organization_id, factory_id)}
    if _has_permission(permissions, permission):
        return user

    # SUSTAINABILITY_CONSULTANT sees factories across every organization
    # (not just ones they hold a membership row in) — check that role's
    # grant directly rather than the org-scoped permission rows above.
    if _has_role_anywhere(user.id, "SUSTAINABILITY_CONSULTANT", permission):
        return user

    # Account was never seeded into user_organization_roles at all (e.g. a
    # self-signup / demo login through the frontend's Supabase auth form) —
    # fall back to the role they registered with instead of hard-blocking
    # every logged-in user who isn't in the RBAC tables.
    if not _user_has_any_membership(user.id):
        role = metadata_role(user)
        if role and _has_permission(METADATA_FALLBACK_PERMISSIONS.get(role, set()), permission):
            return user

    raise HTTPException(status_code=403, detail=f"You do not have access to factory '{factory_id}'.")


ROLE_SCOPE_METADATA: Dict[str, Dict[str, str]] = {
    "SME_OWNER": {
        "role_label": "SME / Factory Owner",
        "factory_access": "Own factory/factories",
        "organization_access": "Own organization",
        "primary_view": "Detailed factory performance, emissions, ML insights, recommendations",
    },
    "FACTORY_OPERATOR": {
        "role_label": "Factory Operator",
        "factory_access": "Assigned factory",
        "organization_access": "Own organization",
        "primary_view": "Operational/process data, alerts, anomalies, actions",
    },
    "SUSTAINABILITY_CONSULTANT": {
        "role_label": "Sustainability Consultant",
        "factory_access": "Client factories",
        "organization_access": "Assigned client organizations",
        "primary_view": "Detailed analysis, comparisons, scenarios, recommendations",
    },
    "INDUSTRY_REGULATOR": {
        "role_label": "Sustainability / Industry Regulator",
        "factory_access": "All factories under jurisdiction",
        "organization_access": "All registered organizations/factories in jurisdiction",
        "primary_view": "Industry-wide monitoring, compliance, emissions, risk, comparisons",
    },
}


@router.get("/scopes", tags=["Authentication & RBAC"])
def get_role_scopes():
    """Returns the platform-wide role scope and data visibility hierarchy."""
    return {"status": "success", "data": ROLE_SCOPE_METADATA}


@router.get("/me")
def get_me(user: CurrentUser = Depends(get_current_user)):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT u.id, u.email, u.full_name, u.avatar_url, u.is_active,
                       uor.id AS membership_id, uor.organization_id, uor.factory_id,
                       r.id AS role_id, r.name AS role_name, r.description AS role_description,
                       uor.expires_at
                FROM users u
                LEFT JOIN user_organization_roles uor ON uor.user_id = u.id
                LEFT JOIN roles r ON r.id = uor.role_id
                WHERE u.id = %s
                  AND (uor.expires_at IS NULL OR uor.expires_at > NOW())
                ORDER BY uor.organization_id, r.name;
                """,
                (user.id,),
            )
            rows = [dict(row) for row in cur.fetchall()]

            # Also query user jurisdiction assignments for regulators
            cur.execute(
                """
                SELECT jurisdiction, granted_at
                FROM user_jurisdictions
                WHERE user_id = %s;
                """,
                (user.id,),
            )
            jurisdictions = [dict(j) for j in cur.fetchall()]

        profile = rows[0] if rows else {"id": user.id, "email": user.email}
        primary_role = rows[0]["role_name"] if rows and rows[0].get("role_name") else "SME_OWNER"
        scope_info = ROLE_SCOPE_METADATA.get(primary_role, ROLE_SCOPE_METADATA["SME_OWNER"])

        return {
            "status": "success",
            "data": {
                "user": profile,
                "primary_role": primary_role,
                "scope": scope_info,
                "jurisdictions": jurisdictions,
                "memberships": rows,
                "permissions": _permission_rows(user.id),
            },
        }
    finally:
        conn.close()


@router.get("/permissions")
def list_permissions(user: CurrentUser = Depends(get_current_user)):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, code, category, description, created_at FROM permissions ORDER BY category, code;")
            rows = [dict(row) for row in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/roles")
def list_roles(user: CurrentUser = Depends(get_current_user)):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT r.id, r.name, r.description, r.permissions AS legacy_permissions,
                       COALESCE(json_agg(json_build_object('id', p.id, 'code', p.code, 'category', p.category))
                         FILTER (WHERE p.id IS NOT NULL), '[]') AS permissions
                FROM roles r
                LEFT JOIN role_permissions rp ON rp.role_id = r.id
                LEFT JOIN permissions p ON p.id = rp.permission_id
                GROUP BY r.id
                ORDER BY r.name;
                """
            )
            rows = [dict(row) for row in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.get("/organizations/{organization_id}/members")
def list_members(organization_id: str, user: CurrentUser = Depends(require_permission("org:manage_users"))):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT uor.id, uor.user_id, u.email, u.full_name, uor.organization_id,
                       uor.factory_id, uor.role_id, r.name AS role_name,
                       uor.granted_by, uor.granted_at, uor.expires_at
                FROM user_organization_roles uor
                JOIN users u ON u.id = uor.user_id
                JOIN roles r ON r.id = uor.role_id
                WHERE uor.organization_id = %s
                ORDER BY u.full_name NULLS LAST, u.email;
                """,
                (organization_id,),
            )
            rows = [dict(row) for row in cur.fetchall()]
        return {"status": "success", "count": len(rows), "data": rows}
    finally:
        conn.close()


@router.post("/organizations/{organization_id}/members", status_code=status.HTTP_201_CREATED)
def assign_membership(
    organization_id: str,
    payload: MembershipCreate,
    user: CurrentUser = Depends(require_permission("org:manage_users")),
):
    conn = get_conn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO user_organization_roles
                    (user_id, organization_id, role_id, factory_id, granted_by, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, organization_id, role_id, factory_id)
                DO UPDATE SET expires_at = EXCLUDED.expires_at, granted_by = EXCLUDED.granted_by
                RETURNING *;
                """,
                (payload.user_id, organization_id, payload.role_id, payload.factory_id, user.id, payload.expires_at),
            )
            membership = dict(cur.fetchone())
        conn.commit()
        return {"status": "success", "data": membership}
    except psycopg2.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Could not assign membership") from exc
    finally:
        conn.close()


@router.delete("/organizations/{organization_id}/members/{membership_id}")
def remove_membership(
    organization_id: str,
    membership_id: str,
    user: CurrentUser = Depends(require_permission("org:manage_users")),
):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM user_organization_roles WHERE id = %s AND organization_id = %s RETURNING id;",
                (membership_id, organization_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Membership not found")
        conn.commit()
        return {"status": "success", "membership_id": membership_id}
    finally:
        conn.close()
