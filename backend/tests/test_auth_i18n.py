"""EduSense auth + i18n tests (JWT, bcrypt, lockout, reset, Hindi tutor)."""
import json
import os
import re
import time
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("BASE_URL") or "https://edu-gap-finder.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Login / Cookies / /me ----------
def test_login_sets_cookies_and_me_via_cookie():
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": "student@demo.com", "password": "demo123"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["email"] == "student@demo.com"
    assert "password" not in data["user"] and "password_hash" not in data["user"]
    # cookies set
    cookies = {c.name for c in s.cookies}
    assert "access_token" in cookies, f"missing access_token cookie, got {cookies}"
    assert "refresh_token" in cookies, f"missing refresh_token cookie, got {cookies}"
    # /me via cookie
    r2 = s.get(f"{API}/auth/me")
    assert r2.status_code == 200
    assert r2.json()["email"] == "student@demo.com"


def test_me_via_bearer_token():
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": "teacher@demo.com", "password": "demo123"})
    assert r.status_code == 200
    token = r.json()["token"]
    # New session without cookies, use bearer
    s2 = requests.Session()
    r2 = s2.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200
    assert r2.json()["email"] == "teacher@demo.com"


def test_me_no_auth_401():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_login_bad_password_401_and_lockout():
    # After fix: identifier uses X-Forwarded-For leftmost. Send a stable XFF to guarantee stable identifier.
    email = f"TEST_lockout_{uuid.uuid4().hex[:8]}@demo.com"
    s = _new_session()
    reg = s.post(f"{API}/auth/register", json={"email": email, "password": "goodpass1", "name": "Lock Test", "role": "parent"})
    assert reg.status_code == 200, reg.text
    b = _new_session()
    b.headers.update({"X-Forwarded-For": "203.0.113.42"})
    got_429 = False
    attempts_before_lock = 0
    for i in range(8):
        r = b.post(f"{API}/auth/login", json={"email": email, "password": "wrongpass"})
        if r.status_code == 429:
            got_429 = True
            break
        assert r.status_code == 401, f"attempt {i}: expected 401, got {r.status_code}: {r.text}"
        attempts_before_lock += 1
    assert got_429, f"Lockout never triggered after {attempts_before_lock} bad attempts — fix not working."
    # Also confirm lockout applies to the correct email (still blocks even with correct password until window expires)
    r_correct = b.post(f"{API}/auth/login", json={"email": email, "password": "goodpass1"})
    assert r_correct.status_code == 429, f"Expected 429 during lockout window, got {r_correct.status_code}"


def test_logout_clears_cookies():
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": "parent@demo.com", "password": "demo123"})
    assert r.status_code == 200
    r2 = s.post(f"{API}/auth/logout")
    assert r2.status_code == 200
    # After logout, /me with same session must be 401
    r3 = s.get(f"{API}/auth/me")
    assert r3.status_code == 401


def test_refresh_issues_new_access_token():
    s = _new_session()
    r = s.post(f"{API}/auth/login", json={"email": "school@demo.com", "password": "demo123"})
    assert r.status_code == 200
    # Delete only access_token; keep refresh
    for c in list(s.cookies):
        if c.name == "access_token":
            s.cookies.clear(domain=c.domain, path=c.path, name=c.name)
    r2 = s.post(f"{API}/auth/refresh")
    assert r2.status_code == 200
    assert r2.json().get("ok") is True
    assert "token" in r2.json()


# ---------- Register ----------
def test_register_parent_creates_user_and_returns_bcrypt():
    email = f"TEST_reg_{uuid.uuid4().hex[:8]}@demo.com"
    s = _new_session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "New Parent", "role": "parent"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["user"]["email"] == email.lower()
    assert d["user"]["role"] == "parent"
    assert "password_hash" not in d["user"]
    # cookies set
    assert any(c.name == "access_token" for c in s.cookies)
    # Login should work
    s2 = _new_session()
    r2 = s2.post(f"{API}/auth/login", json={"email": email, "password": "secret123"})
    assert r2.status_code == 200


def test_register_teacher_ok():
    email = f"TEST_regt_{uuid.uuid4().hex[:8]}@demo.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "New T", "role": "teacher"})
    assert r.status_code == 200


@pytest.mark.parametrize("role", ["student", "school_admin", "company_admin", "government", "admin"])
def test_register_disallowed_roles_400(role):
    email = f"TEST_bad_{uuid.uuid4().hex[:8]}@demo.com"
    r = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "X", "role": role})
    assert r.status_code == 400


def test_register_duplicate_email_409():
    email = f"TEST_dup_{uuid.uuid4().hex[:8]}@demo.com"
    r1 = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "X", "role": "parent"})
    assert r1.status_code == 200
    r2 = requests.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "X", "role": "parent"})
    assert r2.status_code == 409


# ---------- Forgot / Reset password ----------
def test_forgot_and_reset_password_flow():
    email = f"TEST_pw_{uuid.uuid4().hex[:8]}@demo.com"
    reg = requests.post(f"{API}/auth/register", json={"email": email, "password": "origpass", "name": "PW", "role": "parent"})
    assert reg.status_code == 200
    r = requests.post(f"{API}/auth/forgot-password", json={"email": email})
    assert r.status_code == 200
    d = r.json()
    assert d.get("ok") is True
    assert "reset_link" in d and "token=" in d["reset_link"]
    token = d["reset_link"].split("token=")[-1]
    # Reset
    r2 = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "newpass1"})
    assert r2.status_code == 200
    # Second attempt should fail
    r3 = requests.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "newpass2"})
    assert r3.status_code == 400
    # Login with new password works
    r4 = requests.post(f"{API}/auth/login", json={"email": email, "password": "newpass1"})
    assert r4.status_code == 200
    # Old password fails
    r5 = requests.post(f"{API}/auth/login", json={"email": email, "password": "origpass"})
    assert r5.status_code == 401


def test_reset_with_invalid_token_400():
    r = requests.post(f"{API}/auth/reset-password", json={"token": "totally-bogus", "new_password": "abcdef1"})
    assert r.status_code == 400


def test_forgot_unknown_email_generic_ok():
    r = requests.post(f"{API}/auth/forgot-password", json={"email": f"nobody_{uuid.uuid4().hex[:6]}@nope.com"})
    assert r.status_code == 200
    # should not include reset_link for unknown email
    assert "reset_link" not in r.json()


# ---------- Google session bogus ----------
def test_google_session_bogus_401():
    r = requests.post(f"{API}/auth/google-session", json={"session_id": "bogus-id-does-not-exist"})
    # Emergent returns non-200 for unknown session -> our code raises 401
    assert r.status_code in (401, 502), f"expected 401/502, got {r.status_code} {r.text}"


# ---------- Demo accounts ----------
def test_demo_accounts_shape():
    r = requests.get(f"{API}/auth/demo-accounts")
    assert r.status_code == 200
    d = r.json()
    expected = {"student", "teacher", "parent", "school_admin", "company_admin", "government"}
    assert expected.issubset(set(d.keys())), f"missing: {expected - set(d.keys())}"
    for role, users in d.items():
        for u in users:
            assert "password" not in u and "password_hash" not in u


# ---------- Tutor Hindi + English ----------
def _get_student_id():
    r = requests.post(f"{API}/auth/login", json={"email": "student@demo.com", "password": "demo123"})
    assert r.status_code == 200
    return r.json()["user"]["id"]


def _first_delta(payload, timeout=60):
    r = requests.post(f"{API}/tutor/stream", json=payload, stream=True, timeout=timeout)
    assert r.status_code == 200
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        try:
            ev = json.loads(line[5:].strip())
        except Exception:
            continue
        if ev.get("type") == "delta" and ev.get("content"):
            r.close()
            return ev["content"]
        if ev.get("type") == "error":
            pytest.fail(f"tutor error: {ev.get('content')}")
    pytest.fail("no delta received")


DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")


def test_tutor_stream_hindi_returns_devanagari():
    sid = _get_student_id()
    # accumulate more content to reduce false negatives from early whitespace-only delta
    r = requests.post(f"{API}/tutor/stream", json={
        "student_id": sid, "message": "भिन्न क्या होती है समझाओ", "mode": "chat", "language": "hi",
    }, stream=True, timeout=90)
    assert r.status_code == 200
    accum = ""
    got_first = False
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        try:
            ev = json.loads(line[5:].strip())
        except Exception:
            continue
        if ev.get("type") == "delta":
            accum += ev.get("content", "")
            got_first = True
            if len(accum) > 80:
                break
        elif ev.get("type") == "done":
            break
        elif ev.get("type") == "error":
            pytest.fail(f"tutor error: {ev.get('content')}")
    r.close()
    assert got_first, "no delta"
    assert DEVANAGARI_RE.search(accum), f"Expected Devanagari script in Hindi tutor response, got: {accum[:200]}"


def test_tutor_stream_english_no_devanagari():
    sid = _get_student_id()
    r = requests.post(f"{API}/tutor/stream", json={
        "student_id": sid, "message": "Explain fractions in one line", "mode": "chat", "language": "en",
    }, stream=True, timeout=90)
    assert r.status_code == 200
    accum = ""
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        try:
            ev = json.loads(line[5:].strip())
        except Exception:
            continue
        if ev.get("type") == "delta":
            accum += ev.get("content", "")
            if len(accum) > 100:
                break
        elif ev.get("type") == "done":
            break
    r.close()
    assert accum, "no english content received"
    assert not DEVANAGARI_RE.search(accum), f"English response should not contain Devanagari: {accum[:200]}"
