# EduSense — AI-powered Student Learning Intelligence Platform

## Overview
A Phase 1 prototype for an AI-powered education platform serving Class 3–8 students in Indian government schools. Tracks teaching, measures understanding, identifies learning gaps, provides personalized home learning, generates adaptive assessments, and delivers analytics for 6 roles.

## Stack
- **Backend**: FastAPI (Python 3.12) + MongoDB (via Motor async driver) — port **8001**
- **Frontend**: React 19 + CRACO + Tailwind CSS + Shadcn UI + Recharts + Framer Motion — port **5000**
- **AI**: Google Gemini (via `google-genai`) for AI Tutor streaming

## How to Run

Two workflows must be running:

| Workflow | Command | Port |
|---|---|---|
| `Backend API` | `cd backend && uvicorn server:app --host 0.0.0.0 --port 8001` | 8001 |
| `Start application` | `cd frontend && PORT=5000 BROWSER=none yarn start` | 5000 |

The frontend proxies all `/api/*` requests to `http://localhost:8001` (see `frontend/package.json` `"proxy"` field).

## Environment Variables / Secrets

| Key | Type | Notes |
|---|---|---|
| `MONGO_URL` | Secret | MongoDB connection string (e.g. Atlas) |
| `DB_NAME` | Env var | Database name — defaults to `edusense` |
| `EMERGENT_LLM_KEY` | Secret | Google Gemini API key for AI Tutor |
| `REACT_APP_BACKEND_URL` | Env var | Set to `""` (empty) so API calls use the CRA proxy |

## Seeding Demo Data

Run once to populate the database with a demo school, 12 accounts, curriculum, and 10 days of activity:

```bash
cd backend && python seed.py
```

Demo password for all accounts: **`demo123`**

## Roles & Demo Accounts
- **Student** — colorful, gamified dashboard, AI Tutor, quizzes
- **Teacher** — record lessons, view struggling students
- **Parent** — child's progress in plain language
- **School Admin (Principal)** — school-wide overview
- **Company Admin** — multi-school / regional analytics
- **Government** — evidence-based school flags, outcomes

## Project Structure
```
backend/          FastAPI app + MongoDB models + seed script
frontend/         React 19 CRA app (CRACO config)
  src/pages/      One file per role dashboard + student sub-pages
  src/components/ Shared UI components
  src/lib/api.js  Axios instance + session helpers
memory/PRD.md     Full product requirements document
```

## User Preferences
<!-- Add preferences here as they come up -->
