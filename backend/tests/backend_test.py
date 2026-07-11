"""EduSense backend API tests."""
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("BASE_URL") or "https://edu-gap-finder.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

DEMO_ACCOUNTS = {
    "student": "student@demo.com",
    "teacher": "teacher@demo.com",
    "parent": "parent@demo.com",
    "school_admin": "school@demo.com",
    "company_admin": "company@demo.com",
    "government": "gov@demo.com",
}


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def users(s):
    out = {}
    for role, email in DEMO_ACCOUNTS.items():
        r = s.post(f"{API}/auth/login", json={"email": email, "password": "demo123"})
        assert r.status_code == 200, f"login failed for {email}: {r.text}"
        out[role] = r.json()["user"]
    return out


# --- Auth ---
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.parametrize("role,email", list(DEMO_ACCOUNTS.items()))
def test_login_all_roles(s, role, email):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": "demo123"})
    assert r.status_code == 200
    data = r.json()
    assert "user" in data and "token" in data
    assert data["user"]["email"] == email
    assert "password" not in data["user"]


def test_login_bad(s):
    r = s.post(f"{API}/auth/login", json={"email": "student@demo.com", "password": "bad"})
    assert r.status_code == 401


def test_demo_accounts(s):
    r = s.get(f"{API}/auth/demo-accounts")
    assert r.status_code == 200
    d = r.json()
    for role in ["student", "teacher", "parent", "school_admin", "company_admin", "government"]:
        assert role in d, f"missing role {role}"
        assert len(d[role]) >= 1


# --- Curriculum ---
def test_curriculum(s):
    r = s.get(f"{API}/curriculum")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    subj = data[0]
    assert "chapters" in subj
    assert len(subj["chapters"]) >= 1
    assert "topics" in subj["chapters"][0]


# --- Student ---
def test_student_today(s, users):
    sid = users["student"]["id"]
    r = s.get(f"{API}/students/{sid}/today")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_student_profile(s, users):
    sid = users["student"]["id"]
    r = s.get(f"{API}/students/{sid}/profile")
    assert r.status_code == 200
    d = r.json()
    for k in ["subjects", "weak_topics", "strong_topics", "trend", "badges"]:
        assert k in d


def test_student_upcoming(s, users):
    sid = users["student"]["id"]
    r = s.get(f"{API}/students/{sid}/upcoming-assessments")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# --- Quiz ---
@pytest.fixture(scope="session")
def a_topic(s):
    r = s.get(f"{API}/curriculum")
    for subj in r.json():
        for ch in subj["chapters"]:
            for t in ch["topics"]:
                # get quiz to ensure questions
                q = s.get(f"{API}/quiz/topic/{t['id']}")
                if q.status_code == 200 and len(q.json().get("questions", [])) >= 5:
                    return {"topic": t, "subject_id": subj["id"], "chapter_id": ch["id"], "quiz": q.json()}
    pytest.skip("no topic with 5 questions found")


def test_quiz_topic(s, a_topic):
    assert len(a_topic["quiz"]["questions"]) == 5
    for q in a_topic["quiz"]["questions"]:
        assert len(q["options"]) == 4


def test_quiz_submit(s, users, a_topic):
    sid = users["student"]["id"]
    qs = a_topic["quiz"]["questions"]
    answers = [{"question_id": q["id"], "selected_index": q["correct_index"]} for q in qs]
    r = s.post(f"{API}/quiz/submit", json={
        "student_id": sid,
        "topic_id": a_topic["topic"]["id"],
        "subject_id": a_topic["subject_id"],
        "answers": answers,
    })
    assert r.status_code == 200
    d = r.json()
    assert d["score"] == 100.0
    assert d["correct"] == len(qs)
    assert len(d["detail"]) == len(qs)


# --- AI Tutor SSE ---
def test_tutor_stream(s, users):
    sid = users["student"]["id"]
    r = s.post(f"{API}/tutor/stream", json={
        "student_id": sid,
        "message": "Explain fractions",
        "mode": "chat",
    }, stream=True, timeout=60)
    assert r.status_code == 200
    got_delta = False
    got_done = False
    for line in r.iter_lines(decode_unicode=True):
        if not line or not line.startswith("data:"):
            continue
        try:
            ev = json.loads(line[5:].strip())
        except Exception:
            continue
        if ev.get("type") == "delta" and ev.get("content"):
            got_delta = True
        if ev.get("type") == "done":
            got_done = True
            break
        if ev.get("type") == "error":
            pytest.fail(f"tutor stream error: {ev.get('content')}")
    assert got_delta, "no delta event received"
    assert got_done, "no done event received"


# --- Adaptive Test ---
def test_adaptive_flow(s, users):
    sid = users["student"]["id"]
    r = s.post(f"{API}/adaptive-test/generate", json={"student_id": sid})
    assert r.status_code == 200
    test = r.json()
    assert "reasons" in test and len(test["reasons"]) >= 1
    assert test["total_questions"] >= 1
    answers = [{"question_id": q["id"], "selected_index": q["correct_index"]} for q in test["questions"]]
    r2 = s.post(f"{API}/adaptive-test/submit", json={
        "test_id": test["id"], "student_id": sid, "answers": answers
    })
    assert r2.status_code == 200
    d = r2.json()
    assert d["score"] == 100.0


# --- Teacher ---
def test_teacher_overview(s, users):
    tid = users["teacher"]["id"]
    r = s.get(f"{API}/teacher/{tid}/overview")
    assert r.status_code == 200
    d = r.json()
    for k in ["students", "class_avg", "struggling_students", "topic_performance"]:
        assert k in d


def test_teaching_record_create(s, users):
    teacher = users["teacher"]
    # get first topic from Math
    curr = s.get(f"{API}/curriculum").json()
    math = next((x for x in curr if x["name"].lower().startswith("math")), curr[0])
    ch = math["chapters"][0]
    tp = ch["topics"][0]
    body = {
        "class_id": teacher.get("class_id") or "",
        "subject_id": math["id"],
        "chapter_id": ch["id"],
        "topic_id": tp["id"],
        "teacher_id": teacher["id"],
        "notes": "TEST_ automated",
    }
    r = s.post(f"{API}/teaching-records", json=body)
    assert r.status_code == 200
    d = r.json()
    assert d["topic_id"] == tp["id"]


# --- Parent ---
def test_parent_child(s, users):
    pid = users["parent"]["id"]
    r = s.get(f"{API}/parent/{pid}/child")
    assert r.status_code == 200
    d = r.json()
    for k in ["profile", "today", "monthly_progress", "suggestions"]:
        assert k in d


# --- School Admin ---
def test_school_overview(s, users):
    sa = users["school_admin"]
    school_id = sa.get("school_id")
    assert school_id, "school_admin missing school_id"
    r = s.get(f"{API}/school/{school_id}/overview")
    assert r.status_code == 200
    d = r.json()
    for k in ["subject_performance", "class_performance", "intervention_needed", "teacher_activity", "curriculum_progress"]:
        assert k in d


# --- Company ---
def test_company_overview(s):
    r = s.get(f"{API}/company/overview")
    assert r.status_code == 200
    d = r.json()
    for k in ["total_schools", "school_performance", "regional", "avg_learning_improvement"]:
        assert k in d


# --- Government ---
def test_government_overview(s):
    r = s.get(f"{API}/government/overview")
    assert r.status_code == 200
    d = r.json()
    for k in ["schools_flagged", "subject_outcomes", "regional", "trend"]:
        assert k in d
    # verify indicators present in flagged schools
    for f in d["schools_flagged"]:
        assert "indicators" in f
        ind = f["indicators"]
        for kk in ["teaching_activity", "participation_pct", "avg_performance"]:
            assert kk in ind
