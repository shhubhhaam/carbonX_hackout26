"""
Seed Demo Users Script
======================
Creates demo users in Supabase Auth AND registers them in the local
users + user_organization_roles tables with correct role assignments:

  1. SME / Factory Owner      -> SME_OWNER role
  2. Factory Operator         -> FACTORY_OPERATOR role
  3. Sustainability Consultant-> SUSTAINABILITY_CONSULTANT role
  4. Sustainability Regulator -> INDUSTRY_REGULATOR role

Run after seed_demo_data.py has populated organizations and factories.
If SERVICE_ROLE_KEY is not in .env, creates placeholder DB-only users.
"""

import os
import json
import logging
import urllib.request
import urllib.error
import hashlib
import uuid

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SeedUsers")

PROJECT_URL = os.getenv("PROJECT_URL", "").rstrip("/")
DATABASE_URL = os.getenv("DATABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

DEMO_USERS = [
    {
        "email": "sme_owner@carbonx.demo",
        "password": "CarbonX@Demo123",
        "full_name": "Rajan Mehta",
        "role_name": "SME_OWNER",
        "user_category": "SME_OWNER",
    },
    {
        "email": "factory_operator@carbonx.demo",
        "password": "CarbonX@Demo123",
        "full_name": "Priya Sharma",
        "role_name": "FACTORY_OPERATOR",
        "user_category": "FACTORY_OPERATOR",
    },
    {
        "email": "sustainability_consultant@carbonx.demo",
        "password": "CarbonX@Demo123",
        "full_name": "Aditya Kumar",
        "role_name": "SUSTAINABILITY_CONSULTANT",
        "user_category": "SUSTAINABILITY_CONSULTANT",
    },
    {
        "email": "industry_regulator@carbonx.demo",
        "password": "CarbonX@Demo123",
        "full_name": "Meera Joshi",
        "role_name": "INDUSTRY_REGULATOR",
        "user_category": "INDUSTRY_REGULATOR",
    },
]


def supabase_admin_request(method, path, body=None):
    if not PROJECT_URL or not SERVICE_ROLE_KEY:
        raise RuntimeError("SERVICE_ROLE_KEY not set.")
    url = f"{PROJECT_URL}/auth/v1/admin/{path.lstrip('/')}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        logger.warning(f"Supabase Admin {method} {path} -> {e.code}: {body}")
        try:
            return json.loads(body)
        except Exception:
            return {}


def upsert_local_user(conn, user_id, email, full_name):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (id, email, full_name, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, TRUE, NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                is_active = TRUE,
                updated_at = NOW();
            """,
            (user_id, email, full_name),
        )
    conn.commit()
    logger.info(f"  [OK] Upserted local user: {email}")


def assign_role(conn, user_id, role_name, org_id, factory_id=None):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM roles WHERE name = %s", (role_name,))
        role = cur.fetchone()
        if not role:
            logger.error(f"  [ERR] Role '{role_name}' not found in DB!")
            return
        role_id = role["id"]
        # Check if already exists (handles NULL factory_id properly)
        cur.execute(
            """
            SELECT id FROM user_organization_roles
            WHERE user_id = %s AND organization_id = %s AND role_id = %s
              AND (factory_id = %s OR (factory_id IS NULL AND %s IS NULL))
            LIMIT 1;
            """,
            (user_id, org_id, role_id, factory_id, factory_id),
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                "UPDATE user_organization_roles SET granted_at = NOW() WHERE id = %s;",
                (existing["id"],),
            )
        else:
            cur.execute(
                """
                INSERT INTO user_organization_roles
                    (user_id, role_id, organization_id, factory_id, granted_at)
                VALUES (%s, %s, %s, %s, NOW());
                """,
                (user_id, role_id, org_id, factory_id),
            )
    conn.commit()
    logger.info(f"  [OK] Assigned role {role_name} to {user_id}")


def add_jurisdiction(conn, user_id, jurisdiction="India"):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO user_jurisdictions (user_id, jurisdiction, granted_at)
            VALUES (%s, %s, NOW())
            ON CONFLICT (user_id, jurisdiction) DO NOTHING;
            """,
            (user_id, jurisdiction),
        )
    conn.commit()
    logger.info(f"  [OK] Added jurisdiction '{jurisdiction}' to {user_id}")


def get_or_create_auth_user(email, password, full_name, user_category):
    result = supabase_admin_request(
        "POST",
        "users",
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"full_name": full_name, "user_category": user_category},
        },
    )
    if result.get("id"):
        logger.info(f"  [OK] Created Supabase Auth user: {email}")
        return result["id"]

    # Already exists — list to find it
    listed = supabase_admin_request("GET", "users?per_page=1000")
    for u in listed.get("users", []):
        if u.get("email") == email:
            logger.info(f"  [->] Found existing Supabase Auth user: {email}")
            supabase_admin_request(
                "PUT",
                f"users/{u['id']}",
                {"user_metadata": {"full_name": full_name, "user_category": user_category}},
            )
            return u["id"]

    raise RuntimeError(f"Could not create or find auth user for {email}: {result}")


def deterministic_uuid(email):
    return str(uuid.UUID(hashlib.md5(email.encode()).hexdigest()))


def main():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, name FROM organizations WHERE slug = 'industech-global' LIMIT 1;")
            org = cur.fetchone()
            if not org:
                cur.execute("SELECT id, name FROM organizations LIMIT 1;")
                org = cur.fetchone()
            if not org:
                logger.error("No organization found! Run seed_demo_data.py first.")
                return

            org_id = org["id"]
            logger.info(f"Org: {org['name']} ({org_id})")

            cur.execute("SELECT id FROM factories WHERE code = 'demo1' LIMIT 1;")
            steel = cur.fetchone()
            steel_factory_id = steel["id"] if steel else None
            logger.info(f"Steel factory ID: {steel_factory_id or 'N/A'}")

        logger.info(f"\nSeeding {len(DEMO_USERS)} demo users...\n")

        for demo in DEMO_USERS:
            logger.info(f"--- {demo['role_name']} ({demo['email']}) ---")

            if SERVICE_ROLE_KEY:
                user_id = get_or_create_auth_user(
                    demo["email"], demo["password"], demo["full_name"], demo["user_category"]
                )
            else:
                user_id = deterministic_uuid(demo["email"])
                logger.warning(
                    f"  [WARN] SERVICE_ROLE_KEY not set — using placeholder ID {user_id}. "
                    "Auth login won't work."
                )

            upsert_local_user(conn, user_id, demo["email"], demo["full_name"])

            factory_scope = steel_factory_id if demo["role_name"] == "FACTORY_OPERATOR" else None
            assign_role(conn, user_id, demo["role_name"], org_id, factory_scope)

            if demo["role_name"] == "INDUSTRY_REGULATOR":
                add_jurisdiction(conn, user_id, "India")

        logger.info("\n" + "=" * 70)
        logger.info("  DEMO USER SEEDING COMPLETE")
        logger.info("=" * 70)
        logger.info(f"  {'Role':<30} {'Email':<45} Password")
        logger.info(f"  {'-'*30} {'-'*45} {'-'*16}")
        for d in DEMO_USERS:
            logger.info(f"  {d['role_name']:<30} {d['email']:<45} {d['password']}")
        logger.info("")
        if not SERVICE_ROLE_KEY:
            logger.warning(
                "\n  NOTE: Add SERVICE_ROLE_KEY=<your-service-role-key> to backend/.env\n"
                "  (Supabase Dashboard → Project Settings → API → service_role)\n"
                "  Then re-run this script to enable real Auth login for demo users.\n"
            )

    finally:
        conn.close()


if __name__ == "__main__":
    main()
