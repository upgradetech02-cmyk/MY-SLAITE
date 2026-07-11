"""Authentication (JWT email/password + Emergent Google Auth)."""
import os
import uuid
import bcrypt
import jwt
import logging
import secrets
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Response, Request, Depends
from pydantic import BaseModel, EmailStr, Field
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger("edusense.auth")

JWT_ALG = "HS256"
ACCESS_TTL_MIN = 60 * 8  # 8h — friendly for demo/school day
REFRESH_TTL_DAYS = 7
LOCKOUT_ATTEMPTS = 5
LOCKOUT_MIN = 15

EMERGENT_AUTH_SESSION_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)


def _jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def _create_token(payload: dict, minutes: Optional[int] = None, days: Optional[int] = None) -> str:
    exp = datetime.now(timezone.utc) + (
        timedelta(days=days) if days else timedelta(minutes=minutes or ACCESS_TTL_MIN)
    )
    return jwt.encode({**payload, "exp": exp}, _jwt_secret(), algorithm=JWT_ALG)


def create_access(user_id: str, email: str) -> str:
    return _create_token({"sub": user_id, "email": email, "type": "access"}, minutes=ACCESS_TTL_MIN)


def create_refresh(user_id: str) -> str:
    return _create_token({"sub": user_id, "type": "refresh"}, days=REFRESH_TTL_DAYS)


def _decode(token: str) -> dict:
    return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALG])


def _cookie_settings(request: Optional[Request] = None) -> dict:
    host = request.url.hostname if request else ""
    is_local_http = request is not None and request.url.scheme == "http" and host in {"localhost", "127.0.0.1"}
    frontend_url = os.environ.get("FRONTEND_URL", "")
    secure = os.environ.get("COOKIE_SECURE")
    if secure is None:
        secure_cookie = frontend_url.startswith("https://") and not is_local_http
    else:
        secure_cookie = secure.lower() in {"1", "true", "yes", "on"}
    return {
        "httponly": True,
        "samesite": "none" if secure_cookie else "lax",
        "secure": secure_cookie,
        "path": "/",
    }


def _set_auth_cookies(response: Response, access: str, refresh: str, request: Optional[Request] = None) -> None:
    common = _cookie_settings(request)
    response.set_cookie("access_token", access, max_age=ACCESS_TTL_MIN * 60, **common)
    response.set_cookie("refresh_token", refresh, max_age=REFRESH_TTL_DAYS * 86400, **common)


def _clear_auth_cookies(response: Response) -> None:
    for name in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(name, path="/")


async def _current_user_from_request(request: Request, db: AsyncIOMotorDatabase) -> Optional[dict]:
    # Try JWT access token (cookie or Bearer)
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        try:
            payload = _decode(token)
            if payload.get("type") == "access":
                user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
        except jwt.ExpiredSignatureError:
            pass
        except Exception as e:
            logger.info("JWT decode error: %s", e)

    # Emergent Google session
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            exp = session.get("expires_at")
            if isinstance(exp, str):
                exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
            if exp and (exp.tzinfo is None):
                exp = exp.replace(tzinfo=timezone.utc)
            if exp and exp >= datetime.now(timezone.utc):
                user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0, "password_hash": 0})
                if user:
                    return user
    return None


def get_auth_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/auth")

    class RegisterBody(BaseModel):
        email: EmailStr
        password: str = Field(min_length=6)
        name: str
        role: str = "parent"

    class LoginBody(BaseModel):
        email: EmailStr
        password: str

    class ForgotBody(BaseModel):
        email: EmailStr

    class ResetBody(BaseModel):
        token: str
        new_password: str = Field(min_length=6)

    class GoogleSessionBody(BaseModel):
        session_id: str

    async def _record_login_failure(identifier: str):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"last_at": datetime.now(timezone.utc).isoformat()},
            },
            upsert=True,
        )

    async def _check_lockout(identifier: str):
        rec = await db.login_attempts.find_one({"identifier": identifier})
        if not rec:
            return
        if rec.get("count", 0) >= LOCKOUT_ATTEMPTS:
            last = rec.get("last_at")
            if last:
                if isinstance(last, str):
                    last_dt = datetime.fromisoformat(last)
                else:
                    last_dt = last
                if last_dt.tzinfo is None:
                    last_dt = last_dt.replace(tzinfo=timezone.utc)
                if datetime.now(timezone.utc) - last_dt < timedelta(minutes=LOCKOUT_MIN):
                    raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")
                # window elapsed
                await db.login_attempts.delete_one({"identifier": identifier})

    @router.post("/register")
    async def register(body: RegisterBody, response: Response, request: Request):
        email = body.email.lower().strip()
        allowed_roles = {"parent", "teacher"}
        if body.role not in allowed_roles:
            raise HTTPException(status_code=400, detail="Sign-up is only allowed for parent or teacher accounts.")
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        user_id = str(uuid.uuid4())
        doc = {
            "id": user_id,
            "email": email,
            "name": body.name,
            "role": body.role,
            "password_hash": hash_password(body.password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        access = create_access(user_id, email)
        refresh = create_refresh(user_id)
        _set_auth_cookies(response, access, refresh, request)
        doc.pop("password_hash", None)
        doc.pop("_id", None)
        return {"user": doc, "token": access}

    @router.post("/login")
    async def login(body: LoginBody, request: Request, response: Response):
        email = body.email.lower().strip()
        xff = (request.headers.get("x-forwarded-for") or "").split(",")[0].strip()
        ip = xff or (request.client.host if request.client else "unknown")
        identifier = f"{ip}:{email}"
        await _check_lockout(identifier)

        user = await db.users.find_one({"email": email})
        if not user:
            await _record_login_failure(identifier)
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        # Support legacy plaintext `password` field for backward compat; migrate on the fly
        if "password_hash" in user and user["password_hash"]:
            ok = verify_password(body.password, user["password_hash"])
        elif "password" in user and user["password"]:
            ok = user["password"] == body.password
            if ok:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"password_hash": hash_password(body.password)}, "$unset": {"password": ""}},
                )
        else:
            ok = False

        if not ok:
            await _record_login_failure(identifier)
            raise HTTPException(status_code=401, detail="Invalid email or password.")

        # success — clear attempts, issue tokens
        await db.login_attempts.delete_one({"identifier": identifier})
        access = create_access(user["id"], email)
        refresh = create_refresh(user["id"])
        _set_auth_cookies(response, access, refresh, request)
        user.pop("password_hash", None)
        user.pop("password", None)
        user.pop("_id", None)
        return {"user": user, "token": access}

    @router.post("/logout")
    async def logout(response: Response, request: Request):
        # If a session_token cookie is present, revoke it
        stok = request.cookies.get("session_token")
        if stok:
            await db.user_sessions.delete_one({"session_token": stok})
        _clear_auth_cookies(response)
        return {"ok": True}

    @router.get("/me")
    async def me(request: Request):
        user = await _current_user_from_request(request, db)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")
        return user

    @router.post("/refresh")
    async def refresh(request: Request, response: Response):
        token = request.cookies.get("refresh_token")
        if not token:
            raise HTTPException(status_code=401, detail="No refresh token")
        try:
            payload = _decode(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Wrong token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access(user["id"], user["email"])
        response.set_cookie(
            "access_token", access, max_age=ACCESS_TTL_MIN * 60,
            **_cookie_settings(request),
        )
        return {"ok": True, "token": access}

    @router.post("/forgot-password")
    async def forgot_password(body: ForgotBody):
        email = body.email.lower().strip()
        user = await db.users.find_one({"email": email})
        # Do not reveal whether email exists in prod. For prototype, we return the link.
        if not user:
            return {"ok": True, "message": "If this email exists, a reset link has been generated."}
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "email": email,
            "used": False,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "created_at": datetime.now(timezone.utc),
        })
        frontend = os.environ.get("FRONTEND_URL", "").rstrip("/")
        reset_link = f"{frontend}/reset-password?token={token}"
        logger.warning("[PASSWORD RESET] Link for %s: %s", email, reset_link)
        # For the demo, return the link in the response body too
        return {"ok": True, "message": "Reset link generated.", "reset_link": reset_link}

    @router.post("/reset-password")
    async def reset_password(body: ResetBody):
        rec = await db.password_reset_tokens.find_one({"token": body.token})
        if not rec:
            raise HTTPException(status_code=400, detail="Invalid reset token.")
        if rec.get("used"):
            raise HTTPException(status_code=400, detail="This reset link has already been used.")
        exp = rec.get("expires_at")
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp)
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This reset link has expired.")
        await db.users.update_one(
            {"id": rec["user_id"]},
            {"$set": {"password_hash": hash_password(body.new_password)}, "$unset": {"password": ""}},
        )
        await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
        return {"ok": True, "message": "Password reset successful."}

    @router.post("/google-session")
    async def google_session(body: GoogleSessionBody, response: Response, request: Request):
        try:
            resp = requests.get(
                EMERGENT_AUTH_SESSION_URL,
                headers={"X-Session-ID": body.session_id},
                timeout=15,
            )
        except Exception as e:
            logger.exception("Emergent auth call failed")
            raise HTTPException(status_code=502, detail=f"Auth service unreachable: {e}")
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google session.")
        data = resp.json()
        email = (data.get("email") or "").lower().strip()
        name = data.get("name") or email.split("@")[0]
        session_token = data.get("session_token")
        picture = data.get("picture")
        if not email or not session_token:
            raise HTTPException(status_code=400, detail="Invalid Google session payload.")

        user = await db.users.find_one({"email": email})
        if user:
            update = {"picture": picture, "google_id": data.get("id")}
            if not user.get("password_hash"):
                # Google-only user — leave password_hash empty
                pass
            await db.users.update_one({"id": user["id"]}, {"$set": {k: v for k, v in update.items() if v}})
        else:
            user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": name,
                "picture": picture,
                "role": "parent",  # default new social users become parents
                "google_id": data.get("id"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.users.insert_one(user)

        expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS)
        await db.user_sessions.insert_one({
            "session_token": session_token,
            "user_id": user["id"],
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
        })
        response.set_cookie(
            "session_token", session_token,
            max_age=REFRESH_TTL_DAYS * 86400,
            **_cookie_settings(request),
        )
        # also issue JWT for consistency
        access = create_access(user["id"], email)
        refresh = create_refresh(user["id"])
        _set_auth_cookies(response, access, refresh, request)
        user.pop("password_hash", None)
        user.pop("_id", None)
        return {"user": user, "token": access}

    @router.get("/demo-accounts")
    async def demo_accounts():
        users = await db.users.find({}, {"_id": 0, "password_hash": 0, "password": 0}).to_list(500)
        grouped: Dict[str, list] = {}
        for u in users:
            grouped.setdefault(u["role"], []).append({
                "id": u["id"], "email": u["email"], "name": u["name"],
            })
        return {k: v[:3] for k, v in grouped.items()}

    return router


async def ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True, sparse=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.login_attempts.create_index("identifier")
