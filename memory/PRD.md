# EduSense — AI-powered Student Learning Intelligence Platform

## Problem Statement
Build a modern, functional, responsive prototype for an AI-powered education platform for Class 3-8 students in Indian government schools. Tracks what students are taught, measures understanding, identifies learning gaps, provides personalized home learning, generates adaptive assessments, and creates analytics for 6 roles: Student, Parent, Teacher, School Admin, Company Admin, Government.

Phase 1 focuses on ONE DEMO SCHOOL, Class 5, three subjects (Mathematics, Science, English), one demo teacher, multiple demo students.

## User Personas
- **Student (Class 3-8)** — colorful, engaging, simple UI. Wants to learn and revise easily.
- **Teacher** — needs to record what was taught, see who is struggling.
- **Parent** — wants to understand child's progress in simple terms.
- **School Admin (Principal)** — wants overview of teachers, students, curriculum coverage.
- **Company Admin (EduSense HQ)** — cross-school analytics, regional performance.
- **Government (Dept. of Education)** — evidence-based school flags, curriculum progress, subject outcomes.

## Architecture
- **Backend**: FastAPI (Python) + MongoDB, streaming SSE for AI Tutor
- **Frontend**: React 19 + React Router + Tailwind + Shadcn UI + Recharts + Framer Motion
- **AI**: Gemini 3 Flash via Emergent LLM Key (emergentintegrations)
- **Auth**: Simple demo login (email + password) with pre-seeded accounts

## Data Model
- users (with role, school_id, class_id, subject_id, streak_days, badges, child_id)
- schools (region, district, code)
- classes (school_id, grade)
- subjects, chapters, topics (curriculum tree)
- questions (topic_id, options, correct_index, explanation)
- teaching_records (teacher marks class as taught)
- learning_activities (per-student per-topic activity ledger)
- understanding_scores (from quizzes & adaptive tests)
- home_sessions (AI Tutor session log)
- assessments (adaptive tests with reasons for question selection)

## Phase 1 Implemented (2026-02-06)
- Role-based demo login with 12 pre-seeded accounts + role picker UI
- Student dashboard: What I Studied Today, Continue Learning, Revise, Weak Topics, Streak, Badges, Upcoming Personalised Test
- Concept Understanding Quiz (5 Qs, per-topic questions) with score → understanding_scores DB update
- **AI Tutor** with real Gemini 3 Flash streaming, buttons: Explain Again / Another Example / Make It Easier / Practice
- Student Learning Profile with charts (subjects, topics, strong/weak, trend, badges, streak)
- **Adaptive Assessment Generator** — ranks weak topics, picks targeted questions, shows reason per topic
- Teacher dashboard with 3-step Record Today's Teaching workflow (Subject → Chapter → Topic → Mark), class KPIs, topic performance chart, struggling students, students table
- Parent dashboard: today's lessons, monthly progress line chart, strong/weak topics, tailored suggestions
- School Admin dashboard: total students/teachers/classes, subject/class performance charts, intervention list, teacher activity, curriculum progress
- Company Admin dashboard: multi-school KPIs, regional analytics, school comparison, learning improvement
- Government dashboard: evidence-based flags (participation + teaching activity + outcomes, NOT just scores), subject outcomes, regional performance, trend

## Currently Simulated
- Demo data seeded via `backend/seed.py` (10 days of teaching records + quiz scores + home sessions)
- Login is password-based demo (`demo123`) — production would need proper hashing/JWT
- Government access is un-filtered (production would need permission-scoped views per region)
- Multilingual support deferred (Phase 1 is English-only)

## Backlog (Phase 2+)
- P0: Real JWT auth + password reset
- P0: Multilingual support (Hindi + regional languages)
- P1: Voice interaction with AI Tutor (STT/TTS)
- P1: Offline mode + PWA for low-bandwidth schools
- P1: Teacher-uploaded custom lesson notes
- P2: Government permission scoping (region/district level access)
- P2: Multi-school onboarding wizard (currently seeded)
- P2: Achievement badges auto-awarding logic (currently pre-seeded per student)
- P2: Class-level attendance integration
- P2: Custom hardware integration hooks
