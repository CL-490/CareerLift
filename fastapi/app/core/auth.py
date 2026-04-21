"""Authentication helpers: JWT, password hashing, current-user dependency,
seed-user bootstrap, and the lifespan migration that retro-attaches existing
unowned graph data to the seed user."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db


# ---- password hashing -----------------------------------------------------

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False
    try:
        return _pwd_context.verify(plain, hashed)
    except Exception:
        return False


# ---- JWT ------------------------------------------------------------------

JWT_ALG = "HS256"


def create_access_token(
    *,
    user_id: str,
    email: str,
    name: Optional[str] = None,
    role: str = "user",
    extra: Optional[dict] = None,
) -> str:
    if not settings.auth_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AUTH_JWT_SECRET is not configured on the server. Set it in .env and restart the backend.",
        )
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "name": name or email,
        "role": role,
        "iss": settings.auth_jwt_issuer,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.auth_jwt_ttl_hours)).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.auth_jwt_secret, algorithm=JWT_ALG)


def verify_access_token(token: str) -> dict:
    if not settings.auth_jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AUTH_JWT_SECRET not configured on the server.",
        )
    try:
        payload = jwt.decode(
            token,
            settings.auth_jwt_secret,
            algorithms=[JWT_ALG],
            issuer=settings.auth_jwt_issuer,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")
    return payload


# ---- FastAPI dependency ---------------------------------------------------


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split(" ", 1)[1].strip()
    payload = verify_access_token(token)
    return {
        "id": payload["sub"],
        "email": payload.get("email"),
        "name": payload.get("name"),
        "role": payload.get("role", "user"),
    }


# ---- Neo4j user upsert ----------------------------------------------------


async def find_user_by_email(db, email: str) -> Optional[dict]:
    result = await db.run(
        "MATCH (u:User {email: $email}) RETURN u",
        email=email.lower(),
    )
    record = await result.single()
    if not record:
        return None
    return dict(record["u"])


async def upsert_oauth_user(
    db,
    *,
    provider: str,
    subject: str,
    email: str,
    name: Optional[str],
    image: Optional[str],
) -> dict:
    """Create or refresh a User node from an OAuth callback. Email is the
    primary identity key — provider+subject are stored as audit fields."""
    email = (email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="OAuth profile missing email")

    query = """
    MERGE (u:User {email: $email})
    ON CREATE SET
        u.id = $new_id,
        u.created_at = datetime(),
        u.role = 'user'
    SET u.name = coalesce($name, u.name, $email),
        u.image_url = coalesce($image, u.image_url),
        u.oauth_provider = $provider,
        u.oauth_subject = $subject,
        u.updated_at = datetime()
    RETURN u
    """
    result = await db.run(
        query,
        email=email,
        new_id=str(uuid.uuid4()),
        name=name,
        image=image,
        provider=provider,
        subject=subject,
    )
    record = await result.single()
    return dict(record["u"])


async def authenticate_password(db, email: str, password: str) -> Optional[dict]:
    user = await find_user_by_email(db, email)
    if not user:
        return None
    hashed = user.get("password_hash")
    if not hashed or not verify_password(password, hashed):
        return None
    return user


# ---- Seed user bootstrap (idempotent) -------------------------------------


async def bootstrap_seed_user(db) -> Optional[dict]:
    """Ensure the bootstrapped user from BOOTSTRAP_USER_* env vars exists.
    Returns the user dict, or None if not configured."""
    email = (settings.bootstrap_user_email or "").strip().lower()
    password = (settings.bootstrap_user_password or "").strip()
    name = (settings.bootstrap_user_name or "user").strip()
    if not email or not password:
        print(
            "[auth] BOOTSTRAP_USER_EMAIL or BOOTSTRAP_USER_PASSWORD missing; "
            "skipping seed-user bootstrap (OAuth-only login).",
            flush=True,
        )
        return None

    query = """
    MERGE (u:User {email: $email})
    ON CREATE SET
        u.id = $new_id,
        u.created_at = datetime(),
        u.role = 'user',
        u.name = $name,
        u.password_hash = $hash
    SET u.name = coalesce(u.name, $name),
        u.password_hash = $hash,
        u.updated_at = datetime()
    RETURN u
    """
    result = await db.run(
        query,
        email=email,
        new_id=str(uuid.uuid4()),
        name=name,
        hash=hash_password(password),
    )
    record = await result.single()
    user = dict(record["u"])
    print(
        f"[auth] seeded user {email} (id={user['id']})",
        flush=True,
    )
    return user


# ---- Orphan data migration (idempotent) -----------------------------------


async def migrate_orphans_to_seed_user(db, seed_user_id: str) -> dict:
    """Attach existing Resume/Person/JobPosting nodes (and their derived
    Skill/Experience/Education edges) to the seed user, and lift legacy
    Person→[HAS_SKILL/HAS_EXPERIENCE/HAS_EDUCATION] edges onto the Resume
    that the Person belongs to. All operations are idempotent (MERGE +
    existence checks)."""
    counts: dict[str, int] = {}

    # 1. Adopt orphan resumes
    result = await db.run(
        """
        MATCH (r:Resume)
        WHERE NOT EXISTS { MATCH (:User)-[:OWNS]->(r) }
        MATCH (u:User {id: $uid})
        MERGE (u)-[:OWNS]->(r)
        RETURN count(r) AS n
        """,
        uid=seed_user_id,
    )
    counts["resumes_adopted"] = (await result.single())["n"]

    # 2. Adopt orphan persons
    result = await db.run(
        """
        MATCH (p:Person)
        WHERE NOT EXISTS { MATCH (:User)-[:OWNS]->(p) }
        MATCH (u:User {id: $uid})
        MERGE (u)-[:OWNS]->(p)
        RETURN count(p) AS n
        """,
        uid=seed_user_id,
    )
    counts["persons_adopted"] = (await result.single())["n"]

    # 3. Adopt orphan saved JobPostings (only those reachable from a Resume's
    # SAVED_JOB; standalone scraped JobPostings stay un-OWNED)
    result = await db.run(
        """
        MATCH (:Resume)-[:SAVED_JOB]->(j:JobPosting)
        WHERE NOT EXISTS { MATCH (:User)-[:OWNS]->(j) }
        WITH DISTINCT j
        MATCH (u:User {id: $uid})
        MERGE (u)-[:OWNS]->(j)
        RETURN count(j) AS n
        """,
        uid=seed_user_id,
    )
    counts["jobs_adopted"] = (await result.single())["n"]

    # 4. Lift legacy Person→Skill edges onto each Resume that BELONGS_TO that
    # Person. Idempotent: MERGE then drop the old relationship.
    result = await db.run(
        """
        MATCH (p:Person)-[old:HAS_SKILL]->(s:Skill)
        MATCH (r:Resume)-[:BELONGS_TO]->(p)
        MERGE (r)-[new:HAS_SKILL]->(s)
        ON CREATE SET new.created_at = coalesce(old.created_at, datetime())
        DELETE old
        RETURN count(*) AS n
        """,
    )
    counts["skill_edges_migrated"] = (await result.single())["n"]

    result = await db.run(
        """
        MATCH (p:Person)-[old:HAS_EXPERIENCE]->(e:Experience)
        MATCH (r:Resume)-[:BELONGS_TO]->(p)
        MERGE (r)-[new:HAS_EXPERIENCE]->(e)
        ON CREATE SET new.created_at = coalesce(old.created_at, datetime())
        DELETE old
        RETURN count(*) AS n
        """,
    )
    counts["experience_edges_migrated"] = (await result.single())["n"]

    result = await db.run(
        """
        MATCH (p:Person)-[old:HAS_EDUCATION]->(ed:Education)
        MATCH (r:Resume)-[:BELONGS_TO]->(p)
        MERGE (r)-[new:HAS_EDUCATION]->(ed)
        ON CREATE SET new.created_at = coalesce(old.created_at, datetime())
        DELETE old
        RETURN count(*) AS n
        """,
    )
    counts["education_edges_migrated"] = (await result.single())["n"]

    print(f"[migration] {counts}", flush=True)
    return counts
