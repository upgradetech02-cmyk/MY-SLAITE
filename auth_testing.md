# EduSense Auth Testing Playbook

## Auth Systems Supported

1. **JWT (email + bcrypt password)** — Access token cookie `access_token` (15 min), refresh token cookie `refresh_token` (7 days). Bearer header fallback supported.
2. **Emergent Google Social Login** — Session token cookie `session_token` (7 days). User table + `user_sessions` collection.

Both are accepted by `get_current_user()`.

## Demo Credentials

All accounts share password `demo123` (bcrypt-hashed in DB).

| Role | Email |
|------|-------|
| student | student@demo.com |
| teacher | teacher@demo.com |
| parent | parent@demo.com |
| school_admin | school@demo.com |
| company_admin | company@demo.com |
| government | gov@demo.com |

## Endpoints
- POST /api/auth/register — {email, password, name, role}
- POST /api/auth/login — {email, password} → sets cookies, returns user
- GET /api/auth/me — returns user via cookie or Bearer
- POST /api/auth/logout — clears cookies
- POST /api/auth/refresh — refreshes access token
- POST /api/auth/forgot-password — {email} → returns reset link (also logged to console)
- POST /api/auth/reset-password — {token, new_password}
- POST /api/auth/google-session — {session_id} → verifies via Emergent, sets session_token cookie
- GET /api/auth/demo-accounts — lists demo accounts for the picker

## MongoDB Collections
- `users` — has `password_hash` (bcrypt) and legacy `password` removed
- `password_reset_tokens` — TTL indexed on expires_at
- `user_sessions` — session_token from Emergent Google Auth
- `login_attempts` — brute force tracking

## curl tests

```bash
API="https://edu-gap-finder.preview.emergentagent.com"

# Login
curl -c cookies.txt -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.com","password":"demo123"}'

# /me with cookie
curl -b cookies.txt "$API/api/auth/me"

# Register
curl -X POST "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"newteacher@demo.com","password":"pass1234","name":"Ms Test","role":"teacher"}'

# Forgot / Reset (dev-mode returns token in body)
curl -X POST "$API/api/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@demo.com"}'

# Google session (needs real session_id from Emergent OAuth)
curl -X POST "$API/api/auth/google-session" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<SESSION_ID_FROM_URL_FRAGMENT>"}'
```
