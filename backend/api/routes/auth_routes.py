"""Supabase Auth and database-backed RBAC endpoints."""

import json
import os
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


def get_current_user(request: Request) -> CurrentUser:
    """Validate a Supabase access token through Supabase Auth's user endpoint."""
    if not PROJECT_URL or not PUBLISHABLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase Auth is not configured")

    token = _bearer_token(request)
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
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase access token") from exc

    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Supabase token did not identify a user")
    return CurrentUser(id=user_id, email=payload.get("email"))


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
            legacy = [permission for row in cur.fetchall() for permission in (row[0] or [])]

        known = {row["code"] for row in rows if row.get("code")}
        for code in legacy:
            if code not in known:
                rows.append({"code": code, "category": code.split(":", 1)[0], "description": "Legacy role permission"})
        return rows
    finally:
        conn.close()


def require_permission(permission: str):
    def dependency(request: Request, user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        organization_id = request.query_params.get("organization_id")
        factory_id = request.query_params.get("factory_id")
        permissions = {row["code"] for row in _permission_rows(user.id, organization_id, factory_id)}
        legacy_aliases = {
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
        allowed = (
            permission in permissions
            or legacy_aliases.get(permission) in permissions
            or "*" in permissions
            or f"{permission.split(':', 1)[0]}:*" in permissions
        )
        if not allowed:
            raise HTTPException(status_code=403, detail=f"Missing permission: {permission}")
        return user
    return dependency


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
        profile = rows[0] if rows else {"id": user.id, "email": user.email}
        return {
            "status": "success",
            "data": {
                "user": profile,
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
