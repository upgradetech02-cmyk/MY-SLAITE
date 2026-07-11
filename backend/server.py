"""EduSense — AI-powered student learning intelligence platform (Phase 1 prototype)."""
from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import json
import random
from google import genai

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="EduSense API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("edusense")
logging.basicConfig(level=logging.INFO)

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
from auth import get_auth_router, ensure_indexes  # noqa: E402

api.include_router(get_auth_router(db))


@app.on_event("startup")
async def _startup():
    await ensure_indexes(db)
    logger.info("EduSense auth indexes ensured.")


# ---------- Curriculum ----------
@api.get("/curriculum")
async def curriculum():
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(50)
    result = []
    for s in subjects:
        chapters = await db.chapters.find({"subject_id": s["id"]}, {"_id": 0}).to_list(50)
        for c in chapters:
            c["topics"] = await db.topics.find({"chapter_id": c["id"]}, {"_id": 0}).to_list(50)
        s["chapters"] = chapters
        result.append(s)
    return result


# ---------- Teacher ----------
class TeachRecord(BaseModel):
    class_id: str
    subject_id: str
    chapter_id: str
    topic_id: str
    teacher_id: str
    notes: Optional[str] = ""


@api.post("/teaching-records")
async def create_teaching_record(body: TeachRecord):
    doc = body.model_dump()
    doc["id"] = new_id()
    doc["taught_at"] = now_iso()
    await db.teaching_records.insert_one(doc)
    doc.pop("_id", None)

    students = await db.users.find({"role": "student", "class_id": body.class_id}, {"_id": 0}).to_list(300)
    activity_docs = []
    for st in students:
        activity_docs.append({
            "id": new_id(),
            "student_id": st["id"],
            "topic_id": body.topic_id,
            "chapter_id": body.chapter_id,
            "subject_id": body.subject_id,
            "source": "school",
            "date": now_iso(),
        })
    if activity_docs:
        await db.learning_activities.insert_many(activity_docs)
    return doc


@api.get("/teaching-records")
async def list_teaching_records(class_id: Optional[str] = None, teacher_id: Optional[str] = None, days: int = 7):
    q: Dict[str, Any] = {}
    if class_id:
        q["class_id"] = class_id
    if teacher_id:
        q["teacher_id"] = teacher_id
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    q["taught_at"] = {"$gte": cutoff}
    records = await db.teaching_records.find(q, {"_id": 0}).sort("taught_at", -1).to_list(200)
    for r in records:
        r["topic"] = await db.topics.find_one({"id": r["topic_id"]}, {"_id": 0})
        r["chapter"] = await db.chapters.find_one({"id": r["chapter_id"]}, {"_id": 0})
        r["subject"] = await db.subjects.find_one({"id": r["subject_id"]}, {"_id": 0})
    return records


@api.get("/teacher/{teacher_id}/overview")
async def teacher_overview(teacher_id: str):
    teacher = await db.users.find_one({"id": teacher_id}, {"_id": 0, "password": 0})
    if not teacher:
        raise HTTPException(status_code=404, detail="Not found")
    class_id = teacher.get("class_id")
    students = await db.users.find({"role": "student", "class_id": class_id}, {"_id": 0, "password": 0}).to_list(300)

    struggling = []
    class_avg = 0
    topic_perf: Dict[str, Dict[str, Any]] = {}
    n = 0
    for st in students:
        scores = await db.understanding_scores.find({"student_id": st["id"]}, {"_id": 0}).to_list(500)
        weak_count = 0
        avg = 0
        if scores:
            avg = sum(s["score"] for s in scores) / len(scores)
            n += 1
            class_avg += avg
            weak_count = sum(1 for s in scores if s["score"] < 50)
            for s in scores:
                key = s["topic_id"]
                topic_perf.setdefault(key, {"topic_id": key, "scores": []})
                topic_perf[key]["scores"].append(s["score"])
        st["avg_score"] = round(avg, 1)
        st["weak_topics_count"] = weak_count
        if weak_count >= 2 or (scores and avg < 55):
            struggling.append(st)
    class_avg = round(class_avg / n, 1) if n else 0

    topic_perf_list = []
    for tp in topic_perf.values():
        topic = await db.topics.find_one({"id": tp["topic_id"]}, {"_id": 0})
        if topic:
            tp["name"] = topic["name"]
            tp["avg"] = round(sum(tp["scores"]) / len(tp["scores"]), 1)
            tp["submissions"] = len(tp["scores"])
            del tp["scores"]
            topic_perf_list.append(tp)
    topic_perf_list.sort(key=lambda x: x["avg"])

    records_today = await db.teaching_records.count_documents({
        "teacher_id": teacher_id,
        "taught_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()},
    })
    total_records = await db.teaching_records.count_documents({"teacher_id": teacher_id})

    return {
        "teacher": teacher,
        "class_id": class_id,
        "students": students,
        "class_avg": class_avg,
        "struggling_students": struggling,
        "topic_performance": topic_perf_list,
        "records_today": records_today,
        "total_records": total_records,
        "total_students": len(students),
    }


# ---------- Students ----------
@api.get("/students/{student_id}/today")
async def student_today(student_id: str):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    activities = await db.learning_activities.find(
        {"student_id": student_id, "date": {"$gte": today_start}}, {"_id": 0}
    ).to_list(50)
    # dedupe by topic
    seen = set()
    unique = []
    for a in activities:
        if a["topic_id"] in seen:
            continue
        seen.add(a["topic_id"])
        a["topic"] = await db.topics.find_one({"id": a["topic_id"]}, {"_id": 0})
        a["subject"] = await db.subjects.find_one({"id": a["subject_id"]}, {"_id": 0})
        a["chapter"] = await db.chapters.find_one({"id": a["chapter_id"]}, {"_id": 0})
        unique.append(a)
    # If nothing today, fall back to most recent activities (so demo always shows content)
    if not unique:
        recent = await db.learning_activities.find({"student_id": student_id}, {"_id": 0}).sort("date", -1).to_list(30)
        for a in recent:
            if a["topic_id"] in seen:
                continue
            seen.add(a["topic_id"])
            a["topic"] = await db.topics.find_one({"id": a["topic_id"]}, {"_id": 0})
            a["subject"] = await db.subjects.find_one({"id": a["subject_id"]}, {"_id": 0})
            a["chapter"] = await db.chapters.find_one({"id": a["chapter_id"]}, {"_id": 0})
            unique.append(a)
            if len(unique) >= 3:
                break
    return unique


@api.get("/students/{student_id}/profile")
async def student_profile(student_id: str):
    student = await db.users.find_one({"id": student_id}, {"_id": 0, "password": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    scores = await db.understanding_scores.find({"student_id": student_id}, {"_id": 0}).to_list(500)
    activities = await db.learning_activities.find({"student_id": student_id}, {"_id": 0}).to_list(500)
    home_sessions = await db.home_sessions.find({"student_id": student_id}, {"_id": 0}).to_list(200)

    subject_stats: Dict[str, Dict[str, Any]] = {}
    topic_stats: Dict[str, Dict[str, Any]] = {}
    for s in scores:
        subj_id = s.get("subject_id")
        subject_stats.setdefault(subj_id, {"scores": []})["scores"].append(s["score"])
        topic_stats.setdefault(s["topic_id"], {"scores": [], "subject_id": subj_id})["scores"].append(s["score"])

    subjects_out = []
    strong_subjects, weak_subjects = [], []
    for subj_id, st in subject_stats.items():
        subj = await db.subjects.find_one({"id": subj_id}, {"_id": 0})
        if not subj:
            continue
        avg = round(sum(st["scores"]) / len(st["scores"]), 1)
        item = {"id": subj_id, "name": subj["name"], "avg": avg, "attempts": len(st["scores"])}
        subjects_out.append(item)
        if avg >= 70:
            strong_subjects.append(item)
        elif avg < 55:
            weak_subjects.append(item)

    topics_out, weak_topics, strong_topics = [], [], []
    for tid, ts in topic_stats.items():
        t = await db.topics.find_one({"id": tid}, {"_id": 0})
        if not t:
            continue
        avg = round(sum(ts["scores"]) / len(ts["scores"]), 1)
        subj = await db.subjects.find_one({"id": ts["subject_id"]}, {"_id": 0})
        item = {"id": tid, "name": t["name"], "avg": avg, "attempts": len(ts["scores"]),
                "subject": subj["name"] if subj else ""}
        topics_out.append(item)
        if avg < 55:
            weak_topics.append(item)
        elif avg >= 75:
            strong_topics.append(item)

    weak_topics.sort(key=lambda x: x["avg"])
    strong_topics.sort(key=lambda x: -x["avg"])

    trend: Dict[str, list] = {}
    for s in scores:
        day = s["date"][:10]
        trend.setdefault(day, []).append(s["score"])
    trend_list = [{"date": d, "avg": round(sum(v) / len(v), 1)} for d, v in sorted(trend.items())]

    total_topics = await db.topics.count_documents({})
    completed_topics = len(set(s["topic_id"] for s in scores))
    time_spent_min = sum(hs.get("duration_min", 8) for hs in home_sessions)
    overall = round(sum(s["score"] for s in scores) / len(scores), 1) if scores else 0

    return {
        "student": student,
        "subjects": subjects_out,
        "topics": topics_out,
        "strong_subjects": strong_subjects,
        "weak_subjects": weak_subjects,
        "strong_topics": strong_topics[:5],
        "weak_topics": weak_topics[:5],
        "trend": trend_list,
        "overall_score": overall,
        "total_activities": len(activities),
        "completed_topics": completed_topics,
        "total_topics": total_topics,
        "home_sessions": len(home_sessions),
        "time_spent_min": time_spent_min,
        "streak_days": student.get("streak_days", 0),
        "badges": student.get("badges", []),
    }


def _strip_ids(obj):
    if isinstance(obj, list):
        return [_strip_ids(x) for x in obj]
    if isinstance(obj, dict):
        return {k: _strip_ids(v) for k, v in obj.items() if k != "_id"}
    return obj


@api.get("/students/{student_id}/upcoming-assessments")
async def upcoming_assessments(student_id: str):
    assessments = await db.assessments.find(
        {"student_id": student_id, "status": "pending"}, {"_id": 0}
    ).to_list(20)
    return _strip_ids(assessments)


# ---------- Quiz & Understanding Check ----------
@api.get("/quiz/topic/{topic_id}")
async def quiz_for_topic(topic_id: str):
    topic = await db.topics.find_one({"id": topic_id}, {"_id": 0})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    questions = await db.questions.find({"topic_id": topic_id}, {"_id": 0}).to_list(20)
    random.shuffle(questions)
    return {"topic": topic, "questions": questions[:5]}


class QuizSubmit(BaseModel):
    student_id: str
    topic_id: str
    subject_id: str
    answers: List[Dict[str, Any]]


@api.post("/quiz/submit")
async def submit_quiz(body: QuizSubmit):
    questions = await db.questions.find({"topic_id": body.topic_id}, {"_id": 0}).to_list(50)
    q_by_id = {q["id"]: q for q in questions}
    correct = 0
    detail = []
    for a in body.answers:
        q = q_by_id.get(a["question_id"])
        if not q:
            continue
        is_right = q["correct_index"] == a["selected_index"]
        correct += 1 if is_right else 0
        detail.append({
            "question": q["question"],
            "options": q["options"],
            "correct_index": q["correct_index"],
            "selected_index": a["selected_index"],
            "is_correct": is_right,
            "explanation": q.get("explanation", ""),
        })
    total = len(body.answers) or 1
    score = round((correct / total) * 100, 1)

    doc = {
        "id": new_id(),
        "student_id": body.student_id,
        "topic_id": body.topic_id,
        "subject_id": body.subject_id,
        "score": score,
        "correct": correct,
        "total": total,
        "date": now_iso(),
        "source": "quiz",
    }
    await db.understanding_scores.insert_one(doc)
    doc.pop("_id", None)

    if score >= 60:
        await db.users.update_one({"id": body.student_id}, {"$inc": {"streak_days": 1}})

    return {"score": score, "correct": correct, "total": total, "detail": detail, "record": doc}


# ---------- AI Tutor ----------
class TutorBody(BaseModel):
    student_id: str
    topic_id: Optional[str] = None
    message: str = ""
    mode: str = "chat"
    language: str = "en"  # "en", "hi", or "te"


async def build_tutor_context(student_id: str, topic_id: Optional[str]):
    student = await db.users.find_one({"id": student_id}, {"_id": 0, "password": 0})
    topic = await db.topics.find_one({"id": topic_id}, {"_id": 0}) if topic_id else None
    chapter = await db.chapters.find_one({"id": topic["chapter_id"]}, {"_id": 0}) if topic else None
    subject = await db.subjects.find_one({"id": topic["subject_id"]}, {"_id": 0}) if topic else None
    return student, topic, chapter, subject


LANG_INSTRUCTIONS = {
    "en": (
        "Reply in simple English (Class 3-8 vocabulary). Short sentences. "
        "Use real-life Indian examples (rotis, cricket runs, kirana shop, rickshaw)."
    ),
    "hi": (
        "Reply in simple conversational Hindi in Devanagari script (Class 3-8 vocabulary). "
        "Use short sentences. Real-life Indian examples (rotis / रोटी, cricket runs, kirana shop / किराना दुकान). "
        "Do NOT reply in English. Do not use romanised Hindi."
    ),
    "te": (
        "Reply in simple conversational Telugu in Telugu script (Class 3-8 vocabulary). "
        "Use short sentences. Use real-life Indian examples that Telugu-speaking children understand "
        "(rotis/chapatis, cricket runs, local shop, bus ride, school lunch). "
        "Do NOT reply in English. Do not use romanised Telugu."
    ),
}


def build_system_prompt(student, topic, chapter, subject, language: str = "en"):
    grade = (student or {}).get("class_label", "Class 5")
    name = (student or {}).get("name", "Student")
    subj_line = (
        f"Subject: {subject['name']}. Chapter: {chapter['name']}. Topic: {topic['name']}. Description: {topic.get('description', '')}"
        if topic else ""
    )
    lang_line = LANG_INSTRUCTIONS.get(language, LANG_INSTRUCTIONS["en"])
    return (
        f"You are Buddy, a warm, playful AI tutor for a {grade} student named {name} in an Indian government school. "
        f"{lang_line} "
        f"Explain step-by-step. Be encouraging. Never say you are an AI. Stay on academic topics. "
        f"Do not use markdown headings or hash symbols. Use plain text with line breaks. "
        f"{subj_line}"
    )


@api.post("/tutor/stream")
async def tutor_stream(body: TutorBody):
    # from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    student, topic, chapter, subject = await build_tutor_context(body.student_id, body.topic_id)
    system_prompt = build_system_prompt(student, topic, chapter, subject, body.language)

    user_text = body.message.strip() or "Hi, can you help me?"
    if body.mode == "explain":
        user_text = f"Please explain '{topic['name'] if topic else 'this topic'}' to me in a simple, fun way with an example."
    elif body.mode == "example":
        user_text = f"Give me one fresh real-life example that helps me understand '{topic['name'] if topic else 'this topic'}'."
    elif body.mode == "easier":
        user_text = f"Explain '{topic['name'] if topic else 'this topic'}' in an even easier way, like I am 8 years old."
    elif body.mode == "practice":
        user_text = f"Give me 2 short practice questions on '{topic['name'] if topic else 'this topic'}'. Do NOT reveal answers yet."

    session_id = f"{body.student_id}:{body.topic_id or 'chat'}:{body.language}"
    

    async def event_gen():
        sess_id = new_id()
        buffer = []
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=system_prompt + "\n\nStudent request: " + user_text
        )
        local_response = response.text or "I couldn't generate a response. Please try again."
        try:
            buffer.append(local_response)
            yield f"data: {json.dumps({'type': 'delta', 'content': local_response})}\n\n"
        except Exception as e:
            logger.exception("tutor stream error")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        full = "".join(buffer)
        await db.home_sessions.insert_one({
            "id": sess_id,
            "student_id": body.student_id,
            "topic_id": body.topic_id,
            "mode": body.mode,
            "user_message": user_text,
            "ai_response": full,
            "date": now_iso(),
            "duration_min": max(3, len(full) // 200),
        })
        yield f"data: {json.dumps({'type': 'done', 'session_id': sess_id})}\n\n"

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ---------- Adaptive Test ----------
class GenerateAdaptiveBody(BaseModel):
    student_id: str


@api.post("/adaptive-test/generate")
async def generate_adaptive_test(body: GenerateAdaptiveBody):
    student = await db.users.find_one({"id": body.student_id}, {"_id": 0, "password": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    scores = await db.understanding_scores.find({"student_id": body.student_id}, {"_id": 0}).to_list(500)
    topic_avg: Dict[str, list] = {}
    for s in scores:
        topic_avg.setdefault(s["topic_id"], []).append(s["score"])
    ranked = sorted(
        ({"topic_id": t, "avg": sum(v) / len(v)} for t, v in topic_avg.items()),
        key=lambda x: x["avg"],
    )
    weak = [r for r in ranked if r["avg"] < 60][:4] or ranked[:3]

    picks = []
    reasons = []
    for w in weak:
        topic = await db.topics.find_one({"id": w["topic_id"]}, {"_id": 0})
        subj = await db.subjects.find_one({"id": topic["subject_id"]}, {"_id": 0}) if topic else None
        qs = await db.questions.find({"topic_id": w["topic_id"]}, {"_id": 0}).to_list(20)
        random.shuffle(qs)
        chosen = qs[:3]
        picks.extend(chosen)
        reasons.append({
            "topic_id": w["topic_id"],
            "topic": topic["name"] if topic else "",
            "subject": subj["name"] if subj else "",
            "avg": round(w["avg"], 1),
            "questions_count": len(chosen),
            "reason": f"Weak in this topic (avg {round(w['avg'], 1)}%). Added {len(chosen)} targeted questions.",
        })

    difficulty = "medium" if (sum(r["avg"] for r in weak) / max(len(weak), 1)) > 40 else "easy"
    test = {
        "id": new_id(),
        "student_id": body.student_id,
        "created_at": now_iso(),
        "status": "pending",
        "reasons": reasons,
        "difficulty": difficulty,
        "questions": picks,
        "total_questions": len(picks),
    }
    await db.assessments.insert_one(dict(test))
    test.pop("_id", None)
    return test


class SubmitAdaptiveBody(BaseModel):
    test_id: str
    student_id: str
    answers: List[Dict[str, Any]]


@api.post("/adaptive-test/submit")
async def submit_adaptive_test(body: SubmitAdaptiveBody):
    test = await db.assessments.find_one({"id": body.test_id}, {"_id": 0})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    q_by_id = {q["id"]: q for q in test["questions"]}
    per_topic: Dict[str, Dict[str, int]] = {}
    detail = []
    correct_total = 0
    for a in body.answers:
        q = q_by_id.get(a["question_id"])
        if not q:
            continue
        ok = q["correct_index"] == a["selected_index"]
        correct_total += 1 if ok else 0
        detail.append({
            "question": q["question"],
            "options": q["options"],
            "correct_index": q["correct_index"],
            "selected_index": a["selected_index"],
            "is_correct": ok,
            "explanation": q.get("explanation", ""),
        })
        per_topic.setdefault(q["topic_id"], {"c": 0, "t": 0})
        per_topic[q["topic_id"]]["t"] += 1
        per_topic[q["topic_id"]]["c"] += 1 if ok else 0

    for tid, r in per_topic.items():
        score = round((r["c"] / r["t"]) * 100, 1) if r["t"] else 0
        subj_id = next((q["subject_id"] for q in test["questions"] if q["topic_id"] == tid), None)
        await db.understanding_scores.insert_one({
            "id": new_id(),
            "student_id": body.student_id,
            "topic_id": tid,
            "subject_id": subj_id,
            "score": score,
            "correct": r["c"],
            "total": r["t"],
            "date": now_iso(),
            "source": "adaptive_test",
        })

    total = len(body.answers) or 1
    overall = round((correct_total / total) * 100, 1)

    await db.assessments.update_one(
        {"id": body.test_id},
        {"$set": {"status": "completed", "score": overall, "completed_at": now_iso()}},
    )

    return {"score": overall, "correct": correct_total, "total": total, "detail": detail}


# ---------- Parent ----------
@api.get("/parent/{parent_id}/child")
async def parent_child(parent_id: str):
    parent = await db.users.find_one({"id": parent_id}, {"_id": 0, "password": 0})
    if not parent or parent.get("role") != "parent":
        raise HTTPException(status_code=404, detail="Parent not found")
    child_id = parent.get("child_id")
    if not child_id:
        raise HTTPException(status_code=404, detail="No child linked")
    profile = await student_profile(child_id)
    today = await student_today(child_id)

    home = await db.home_sessions.count_documents({"student_id": child_id})
    school = await db.learning_activities.count_documents({"student_id": child_id, "source": "school"})

    cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    scores_30 = await db.understanding_scores.find(
        {"student_id": child_id, "date": {"$gte": cutoff}}, {"_id": 0}
    ).to_list(500)
    weeks: Dict[str, list] = {}
    for s in scores_30:
        d = datetime.fromisoformat(s["date"].replace("Z", "+00:00"))
        wk = f"W{d.isocalendar()[1]}"
        weeks.setdefault(wk, []).append(s["score"])
    monthly = [{"week": w, "avg": round(sum(v) / len(v), 1)} for w, v in sorted(weeks.items())]

    suggestions = []
    for t in profile["weak_topics"][:3]:
        suggestions.append(
            f"Spend 10 minutes daily on '{t['name']}' ({t['subject']}) — child scored {t['avg']}%."
        )
    if not suggestions:
        suggestions = ["Keep encouraging your child's learning routine.", "Praise effort, not only marks."]

    return {
        "parent": parent,
        "profile": profile,
        "today": today,
        "home_activity": home,
        "school_activity": school,
        "monthly_progress": monthly,
        "suggestions": suggestions,
    }


# ---------- School Admin ----------
@api.get("/school/{school_id}/overview")
async def school_overview(school_id: str):
    school = await db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    students = await db.users.find({"role": "student", "school_id": school_id}, {"_id": 0, "password": 0}).to_list(500)
    teachers = await db.users.find({"role": "teacher", "school_id": school_id}, {"_id": 0, "password": 0}).to_list(50)
    classes = await db.classes.find({"school_id": school_id}, {"_id": 0}).to_list(50)

    all_scores = await db.understanding_scores.find({}, {"_id": 0}).to_list(10000)
    student_ids = {s["id"] for s in students}
    school_scores = [s for s in all_scores if s["student_id"] in student_ids]
    avg = round(sum(s["score"] for s in school_scores) / len(school_scores), 1) if school_scores else 0

    subj_avg: Dict[str, list] = {}
    for s in school_scores:
        subj_avg.setdefault(s["subject_id"], []).append(s["score"])
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(50)
    subj_by_id = {x["id"]: x["name"] for x in subjects}
    subject_perf = [
        {"subject": subj_by_id.get(k, k), "avg": round(sum(v) / len(v), 1), "n": len(v)}
        for k, v in subj_avg.items()
    ]

    class_by_id = {c["id"]: c["name"] for c in classes}
    class_avg: Dict[str, list] = {}
    st_by_id = {s["id"]: s for s in students}
    for s in school_scores:
        cid = st_by_id[s["student_id"]].get("class_id")
        if cid:
            class_avg.setdefault(cid, []).append(s["score"])
    class_perf = [
        {"class": class_by_id.get(k, k), "avg": round(sum(v) / len(v), 1), "n": len(v)}
        for k, v in class_avg.items()
    ]

    intervention = []
    for st in students:
        stu_scores = [s for s in school_scores if s["student_id"] == st["id"]]
        if not stu_scores:
            continue
        stu_avg = sum(s["score"] for s in stu_scores) / len(stu_scores)
        if stu_avg < 55:
            intervention.append({
                "id": st["id"], "name": st["name"],
                "class": class_by_id.get(st.get("class_id"), ""),
                "avg": round(stu_avg, 1),
            })
    intervention.sort(key=lambda x: x["avg"])

    teacher_activity = []
    for t in teachers:
        n = await db.teaching_records.count_documents({"teacher_id": t["id"]})
        teacher_activity.append({
            "id": t["id"], "name": t["name"],
            "records_logged": n,
            "subject": t.get("subject_name", ""),
        })

    total_topics = await db.topics.count_documents({})
    taught_topic_ids = await db.teaching_records.distinct("topic_id", {"class_id": {"$in": [c["id"] for c in classes]}})
    curriculum_progress = round((len(taught_topic_ids) / total_topics) * 100, 1) if total_topics else 0

    return {
        "school": school,
        "total_students": len(students),
        "total_teachers": len(teachers),
        "total_classes": len(classes),
        "avg_performance": avg,
        "curriculum_progress": curriculum_progress,
        "subject_performance": subject_perf,
        "class_performance": class_perf,
        "intervention_needed": intervention,
        "teacher_activity": teacher_activity,
        "participation": round(len(set(s["student_id"] for s in school_scores)) / max(len(students), 1) * 100, 1),
    }


# ---------- Company Admin ----------
@api.get("/company/overview")
async def company_overview():
    schools = await db.schools.find({}, {"_id": 0}).to_list(200)
    total_students = await db.users.count_documents({"role": "student"})
    total_teachers = await db.users.count_documents({"role": "teacher"})
    total_sessions = await db.home_sessions.count_documents({})
    total_assessments = await db.assessments.count_documents({"status": "completed"})

    scores = await db.understanding_scores.find({}, {"_id": 0}).to_list(10000)
    if scores:
        now = datetime.now(timezone.utc)
        d7 = (now - timedelta(days=7)).isoformat()
        d14 = (now - timedelta(days=14)).isoformat()
        recent = [s["score"] for s in scores if s["date"] >= d7]
        prev = [s["score"] for s in scores if d14 <= s["date"] < d7]
        improvement = round((sum(recent) / len(recent) if recent else 0) - (sum(prev) / len(prev) if prev else 0), 1)
        avg_perf = round(sum(s["score"] for s in scores) / len(scores), 1)
    else:
        improvement = 0
        avg_perf = 0

    active_users = await db.users.count_documents({})
    school_perf = []
    for sc in schools:
        stids = await db.users.distinct("id", {"role": "student", "school_id": sc["id"]})
        sc_scores = [s["score"] for s in scores if s["student_id"] in stids]
        school_perf.append({
            "id": sc["id"],
            "name": sc["name"],
            "region": sc.get("region", ""),
            "students": len(stids),
            "avg": round(sum(sc_scores) / len(sc_scores), 1) if sc_scores else 0,
        })

    region_agg: Dict[str, list] = {}
    for sp in school_perf:
        region_agg.setdefault(sp["region"], []).append(sp["avg"])
    regional = [{"region": r, "avg": round(sum(v) / len(v), 1), "schools": len(v)} for r, v in region_agg.items() if r]

    return {
        "total_schools": len(schools),
        "total_students": total_students,
        "total_teachers": total_teachers,
        "active_users": active_users,
        "learning_sessions": total_sessions,
        "assessments_completed": total_assessments,
        "avg_learning_improvement": improvement,
        "avg_performance": avg_perf,
        "school_performance": school_perf,
        "regional": regional,
    }


# ---------- Government ----------
@api.get("/government/overview")
async def government_overview():
    schools = await db.schools.find({}, {"_id": 0}).to_list(200)
    students = await db.users.count_documents({"role": "student"})
    teaching_records = await db.teaching_records.count_documents({})
    total_topics = await db.topics.count_documents({})
    taught_topic_ids = await db.teaching_records.distinct("topic_id")
    curriculum_progress = round((len(taught_topic_ids) / total_topics) * 100, 1) if total_topics else 0

    all_scores = await db.understanding_scores.find({}, {"_id": 0}).to_list(10000)
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(50)
    subj_names = {s["id"]: s["name"] for s in subjects}
    subj_avg: Dict[str, list] = {}
    for s in all_scores:
        subj_avg.setdefault(s["subject_id"], []).append(s["score"])
    subject_outcomes = [
        {"subject": subj_names.get(k, k), "avg": round(sum(v) / len(v), 1), "n": len(v)}
        for k, v in subj_avg.items()
    ]

    schools_flagged = []
    for sc in schools:
        stids = await db.users.distinct("id", {"role": "student", "school_id": sc["id"]})
        sc_scores = [s for s in all_scores if s["student_id"] in stids]
        cls_ids = await db.classes.distinct("id", {"school_id": sc["id"]})
        n_teach = await db.teaching_records.count_documents({"class_id": {"$in": cls_ids}})
        participation = round(len(set(s["student_id"] for s in sc_scores)) / max(len(stids), 1) * 100, 1)
        avg = round(sum(s["score"] for s in sc_scores) / len(sc_scores), 1) if sc_scores else 0
        indicators = {
            "teaching_activity": n_teach,
            "participation_pct": participation,
            "avg_performance": avg,
        }
        if participation < 70 or avg < 55 or n_teach < 8:
            schools_flagged.append({
                "id": sc["id"],
                "name": sc["name"],
                "region": sc.get("region", ""),
                "indicators": indicators,
                "reason": (
                    ("Low participation. " if participation < 70 else "")
                    + ("Below-average outcomes. " if avg < 55 else "")
                    + ("Low teaching activity. " if n_teach < 8 else "")
                ).strip(),
            })

    region_agg: Dict[str, list] = {}
    for sc in schools:
        stids = await db.users.distinct("id", {"role": "student", "school_id": sc["id"]})
        sc_scores = [s["score"] for s in all_scores if s["student_id"] in stids]
        avg = sum(sc_scores) / len(sc_scores) if sc_scores else 0
        region_agg.setdefault(sc.get("region", "Unknown"), []).append(avg)
    regional = [{"region": r, "avg": round(sum(v) / len(v), 1), "schools": len(v)} for r, v in region_agg.items()]

    weeks: Dict[str, list] = {}
    for s in all_scores:
        d = datetime.fromisoformat(s["date"].replace("Z", "+00:00"))
        wk = f"W{d.isocalendar()[1]}"
        weeks.setdefault(wk, []).append(s["score"])
    trend = [{"week": w, "avg": round(sum(v) / len(v), 1)} for w, v in sorted(weeks.items())][-8:]

    return {
        "schools_monitored": len(schools),
        "students": students,
        "teaching_records": teaching_records,
        "curriculum_progress": curriculum_progress,
        "subject_outcomes": subject_outcomes,
        "schools_flagged": schools_flagged,
        "regional": regional,
        "trend": trend,
        "participation": round(len(set(s["student_id"] for s in all_scores)) / max(students, 1) * 100, 1),
    }


@api.get("/")
async def root():
    return {"service": "EduSense", "status": "ok", "ts": now_iso()}


app.include_router(api)
_frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
_allowed_origins = [o for o in [_frontend_url, "http://localhost:3000"] if o]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.(vercel\.app|preview\.emergentagent\.com)",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
