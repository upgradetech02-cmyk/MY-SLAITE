"""Seed demo data for EduSense Phase 1 prototype."""
import asyncio
import os
import random
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def nid() -> str:
    return str(uuid.uuid4())


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# Cache the demo hash once — bcrypt is slow (14 * ~200ms is ~3s per seed run otherwise)
_DEMO_HASH = hash_pw("demo123")


def days_ago(n: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=n)).isoformat()


async def clear():
    for c in [
        "users", "schools", "classes", "subjects", "chapters", "topics",
        "questions", "teaching_records", "learning_activities",
        "understanding_scores", "home_sessions", "assessments",
        "password_reset_tokens", "user_sessions", "login_attempts",
    ]:
        await db[c].drop()


async def seed():
    await clear()

    # ---------- Schools ----------
    demo_school = {
        "id": nid(),
        "name": "Sunrise Government Primary School",
        "region": "Rajasthan",
        "district": "Jaipur",
        "code": "SGPS-001",
    }
    other_schools = [
        {"id": nid(), "name": "Green Valley Government School", "region": "Rajasthan", "district": "Ajmer", "code": "GVGS-002"},
        {"id": nid(), "name": "Lotus Public School", "region": "Uttar Pradesh", "district": "Lucknow", "code": "LPS-003"},
        {"id": nid(), "name": "Ashok Government School", "region": "Bihar", "district": "Patna", "code": "AGS-004"},
    ]
    schools = [demo_school] + other_schools
    await db.schools.insert_many([dict(s) for s in schools])

    # ---------- Classes ----------
    class5 = {"id": nid(), "school_id": demo_school["id"], "name": "Class 5", "grade": 5}
    classes_others = [
        {"id": nid(), "school_id": s["id"], "name": "Class 5", "grade": 5} for s in other_schools
    ]
    classes = [class5] + classes_others
    await db.classes.insert_many([dict(c) for c in classes])

    # ---------- Subjects ----------
    math = {"id": nid(), "name": "Mathematics", "icon": "calculator", "color": "sky"}
    science = {"id": nid(), "name": "Science", "icon": "flask-conical", "color": "emerald"}
    english = {"id": nid(), "name": "English", "icon": "book-open", "color": "rose"}
    hindi = {"id": nid(), "name": "Hindi", "icon": "languages", "color": "amber"}
    sports = {"id": nid(), "name": "Sports", "icon": "trophy", "color": "violet"}

    subjects = [math, science, english, hindi, sports]
    await db.subjects.insert_many([dict(s) for s in subjects])

    # ---------- Chapters + Topics ----------
    curriculum = {
        math["id"]: [
            (
                "Fractions",
                [
                    ("Basic Fractions", "A fraction shows a part of a whole."),
                    ("Equivalent Fractions", "Different fractions with the same value."),
                    ("Addition of Fractions", "Add fractions with same denominator."),
                    ("Subtraction of Fractions", "Subtract fractions carefully."),
                ],
            ),
            (
                "Decimals",
                [
                    ("Reading Decimals", "Decimals use a dot to split whole and part."),
                    ("Adding Decimals", "Line up the decimal point and add."),
                    ("Money and Decimals", "Rupees and paise use decimals."),
                ],
            ),
            (
                "Geometry",
                [
                    ("Shapes", "Squares, triangles, circles around us."),
                    ("Perimeter", "Perimeter is the outline length."),
                    ("Area", "Area is space inside a shape."),
                ],
            ),
        ],

        science["id"]: [
            (
                "Living Things",
                [
                    ("Plants and Animals", "Living things grow, breathe and reproduce."),
                    ("Food Chain", "Who eats what in nature."),
                    ("Habitats", "Where animals live."),
                ],
            ),
            (
                "Our Body",
                [
                    ("Digestion", "How food becomes energy."),
                    ("Bones and Muscles", "Bones support, muscles move."),
                    ("Healthy Habits", "Sleep, food, exercise, hygiene."),
                ],
            ),
            (
                "Water and Weather",
                [
                    ("Water Cycle", "Sun heats water, it rises, cools, falls."),
                    ("Weather vs Climate", "Weather is today, climate is many years."),
                    ("Sources of Water", "Rivers, lakes, wells, rain."),
                ],
            ),
        ],

        english["id"]: [
            (
                "Grammar",
                [
                    ("Nouns and Pronouns", "Names of people, places, things."),
                    ("Verbs and Tenses", "Action words in time."),
                    ("Adjectives", "Words that describe."),
                ],
            ),
            (
                "Reading",
                [
                    ("Story Comprehension", "Reading and understanding a story."),
                    ("Poem Understanding", "Feeling the poem's meaning."),
                ],
            ),
            (
                "Writing",
                [
                    ("Sentence Formation", "Making clear sentences."),
                    ("Letter Writing", "Writing a friendly letter."),
                ],
            ),
        ],

        hindi["id"]: [
            (
                "Hindi Grammar",
                [
                    ("Sangya", "Vyakti, sthan aur vastu ke naam ko sangya kehte hain."),
                    ("Sarvanam", "Sangya ke sthan par prayog hone wale shabd."),
                    ("Kriya", "Kaam ya karya ko batane wale shabd."),
                ],
            ),
            (
                "Hindi Reading",
                [
                    ("Kahani Pathan", "Kahani padhna aur uska arth samajhna."),
                    ("Kavita", "Kavita padhna aur uska bhav samajhna."),
                ],
            ),
            (
                "Hindi Writing",
                [
                    ("Vakya Rachna", "Sahi aur spasht vakya banana."),
                    ("Anuchhed Lekhan", "Kisi vishay par chhota anuchhed likhna."),
                ],
            ),
        ],

        sports["id"]: [
            (
                "Physical Fitness",
                [
                    ("Warm Up", "Simple exercises to prepare the body for activity."),
                    ("Running", "Building speed, stamina and coordination."),
                    ("Stretching", "Improving flexibility and body movement."),
                ],
            ),
            (
                "Games",
                [
                    ("Cricket Basics", "Learning batting, bowling and fielding basics."),
                    ("Football Basics", "Learning passing, dribbling and teamwork."),
                    ("Team Games", "Learning cooperation and fair play."),
                ],
            ),
            (
                "Health and Fitness",
                [
                    ("Healthy Body", "Understanding exercise and physical health."),
                    ("Sportsmanship", "Learning teamwork, respect and fair play."),
                ],
            ),
        ],
    }

    chapter_docs = []
    topic_docs = []
    for subj_id, chapters in curriculum.items():
        for cname, topics in chapters:
            ch = {"id": nid(), "subject_id": subj_id, "name": cname}
            chapter_docs.append(ch)
            for tname, desc in topics:
                topic_docs.append({
                    "id": nid(), "chapter_id": ch["id"], "subject_id": subj_id,
                    "name": tname, "description": desc,
                })
    await db.chapters.insert_many([dict(c) for c in chapter_docs])
    await db.topics.insert_many([dict(t) for t in topic_docs])

    topics_by_name = {t["name"]: t for t in topic_docs}

    # ---------- Questions ----------
    Q = [
        # Math - Basic Fractions
        ("Basic Fractions", "If a pizza is cut into 4 equal parts and you eat 1, what fraction did you eat?", ["1/2", "1/4", "1/3", "3/4"], 1, "One out of four parts is 1/4."),
        ("Basic Fractions", "Which is a fraction?", ["5", "1/2", "10", "0"], 1, "1/2 shows a part of a whole."),
        ("Basic Fractions", "The bottom number of a fraction is called?", ["Numerator", "Denominator", "Divisor", "Quotient"], 1, "Denominator is the bottom number."),
        ("Basic Fractions", "How many halves make one whole?", ["1", "2", "3", "4"], 1, "2 halves = 1 whole."),
        ("Basic Fractions", "Which fraction is smaller?", ["1/2", "1/4", "1/1", "3/4"], 1, "1/4 is smaller than 1/2."),
        # Equivalent Fractions
        ("Equivalent Fractions", "1/2 is equal to?", ["2/3", "2/4", "3/5", "5/6"], 1, "2/4 = 1/2."),
        ("Equivalent Fractions", "3/6 is same as?", ["1/2", "1/3", "1/4", "2/3"], 0, "3/6 simplifies to 1/2."),
        ("Equivalent Fractions", "2/4 = ?", ["1/2", "1/3", "1/4", "2/3"], 0, "2 divided by 2 = 1; 4 by 2 = 2."),
        ("Equivalent Fractions", "Which is NOT equal to 1/2?", ["2/4", "3/6", "4/8", "3/5"], 3, "3/5 is not 1/2."),
        ("Equivalent Fractions", "5/10 = ?", ["1/2", "1/4", "2/5", "5/5"], 0, "5/10 = 1/2."),
        # Addition of Fractions
        ("Addition of Fractions", "1/4 + 1/4 = ?", ["1/8", "2/4", "1/2", "Both b and c"], 3, "1/4 + 1/4 = 2/4 = 1/2."),
        ("Addition of Fractions", "2/5 + 1/5 = ?", ["3/10", "3/5", "1/5", "2/25"], 1, "Same denominator: add tops."),
        ("Addition of Fractions", "1/3 + 1/3 + 1/3 = ?", ["1/9", "1", "3", "1/3"], 1, "3 thirds make one whole."),
        ("Addition of Fractions", "1/6 + 2/6 = ?", ["3/12", "3/6", "1/2", "Both b and c"], 3, "3/6 = 1/2."),
        ("Addition of Fractions", "For 1/4 + 1/2, we need to?", ["Multiply", "Make same bottom", "Cross out", "Divide"], 1, "Convert to common denominator first."),
        # Subtraction of Fractions
        ("Subtraction of Fractions", "3/5 - 1/5 = ?", ["2/5", "2/10", "1/5", "4/5"], 0, "Same denominator: subtract tops."),
        ("Subtraction of Fractions", "1 - 1/4 = ?", ["3/4", "1/4", "1/2", "0"], 0, "1 whole minus one quarter."),
        ("Subtraction of Fractions", "5/8 - 3/8 = ?", ["2/8", "1/4", "Both", "8/8"], 2, "2/8 = 1/4."),
        # Reading Decimals
        ("Reading Decimals", "How do you read 0.5?", ["Zero point five", "Zero fifty", "Five", "Half zero"], 0, "0.5 is 'zero point five'."),
        ("Reading Decimals", "0.25 means?", ["Twenty five", "25 out of 100", "2.5", "None"], 1, "0.25 = 25/100 = 1/4."),
        ("Reading Decimals", "Which is bigger?", ["0.7", "0.07", "0.007", "0.77"], 3, "0.77 is largest."),
        # Adding Decimals
        ("Adding Decimals", "0.5 + 0.5 = ?", ["1.0", "0.10", "10", "0.55"], 0, "Half + half = one."),
        ("Adding Decimals", "1.2 + 0.8 = ?", ["2.0", "1.10", "1.28", "0.28"], 0, "1.2 + 0.8 = 2.0."),
        ("Adding Decimals", "0.1 + 0.2 = ?", ["0.3", "0.12", "3", "1/2"], 0, "Simple addition."),
        # Money and Decimals
        ("Money and Decimals", "Rs. 5.50 means?", ["Five rupees fifty paise", "5.5 rupees only", "Fifty rupees", "5 rupees"], 0, "The decimal shows paise."),
        ("Money and Decimals", "50 paise as rupees?", ["Rs. 0.50", "Rs. 5", "Rs. 50", "Rs. 5.5"], 0, "100 paise = 1 rupee."),
        ("Money and Decimals", "Rs. 2.25 + Rs. 3.75 = ?", ["Rs. 6", "Rs. 5", "Rs. 6.5", "Rs. 5.5"], 0, "2.25 + 3.75 = 6.00."),
        # Shapes
        ("Shapes", "How many sides does a triangle have?", ["2", "3", "4", "5"], 1, "Tri = three."),
        ("Shapes", "A shape with 4 equal sides is a?", ["Rectangle", "Square", "Circle", "Triangle"], 1, "Square = 4 equal sides."),
        ("Shapes", "A circle has how many corners?", ["0", "1", "2", "Infinite"], 0, "A circle has no corners."),
        # Perimeter
        ("Perimeter", "Perimeter of a square with side 4 cm?", ["8 cm", "16 cm", "12 cm", "4 cm"], 1, "4 * 4 = 16."),
        ("Perimeter", "Perimeter means?", ["Space inside", "Outline length", "Volume", "Weight"], 1, "Outline length."),
        # Area
        ("Area", "Area of rectangle 5x3?", ["8", "15", "10", "20"], 1, "Length x Breadth."),
        ("Area", "Area is measured in?", ["cm", "cm²", "kg", "L"], 1, "Square units."),
        # Science
        ("Plants and Animals", "Which is a living thing?", ["Chair", "Tree", "Stone", "Pen"], 1, "Trees breathe and grow."),
        ("Plants and Animals", "Plants make food by?", ["Sleeping", "Photosynthesis", "Eating", "Running"], 1, "Photosynthesis uses sunlight."),
        ("Plants and Animals", "Which animal lays eggs?", ["Cow", "Hen", "Goat", "Dog"], 1, "Hens lay eggs."),
        ("Food Chain", "In a food chain, plants are called?", ["Consumers", "Producers", "Decomposers", "None"], 1, "Plants produce food."),
        ("Food Chain", "Who eats grass?", ["Tiger", "Cow", "Lion", "Snake"], 1, "Cows are herbivores."),
        ("Habitats", "Fish live in?", ["Desert", "Water", "Snow", "Trees"], 1, "Water habitat."),
        ("Habitats", "Camel is found in?", ["Ocean", "Desert", "Forest", "Mountain"], 1, "Camels live in deserts."),
        ("Digestion", "Where does food go first?", ["Stomach", "Mouth", "Liver", "Lungs"], 1, "Chewing starts in the mouth."),
        ("Digestion", "Which helps digest food in mouth?", ["Bones", "Saliva", "Blood", "Hair"], 1, "Saliva helps."),
        ("Bones and Muscles", "Bones give us?", ["Colour", "Shape and support", "Food", "Water"], 1, "They support our body."),
        ("Bones and Muscles", "Muscles help us?", ["See", "Move", "Hear", "Smell"], 1, "Muscles pull bones to move."),
        ("Healthy Habits", "How many hours of sleep do kids need?", ["2", "9-10", "20", "1"], 1, "9-10 hours."),
        ("Healthy Habits", "Which is healthy?", ["Chips daily", "Fruits daily", "Only sweets", "Skipping meals"], 1, "Fruits are healthy."),
        ("Water Cycle", "Water turns into vapour by?", ["Freezing", "Evaporation", "Melting", "None"], 1, "Sun heats water."),
        ("Water Cycle", "Clouds are made of?", ["Cotton", "Water droplets", "Smoke", "Dust"], 1, "Water droplets in air."),
        ("Weather vs Climate", "Weather is measured over?", ["A day", "Many years", "A month", "A century"], 0, "Weather is short-term."),
        ("Sources of Water", "Which is NOT a source of water?", ["River", "Well", "Book", "Rain"], 2, "Books are not water sources."),
        # English
        ("Nouns and Pronouns", "Which is a noun?", ["Run", "Delhi", "Slowly", "Big"], 1, "Delhi is a place — a noun."),
        ("Nouns and Pronouns", "Which is a pronoun?", ["He", "Run", "Tall", "Delhi"], 0, "He replaces a name."),
        ("Nouns and Pronouns", "Naming word is called?", ["Verb", "Noun", "Adjective", "Adverb"], 1, "Noun = name."),
        ("Verbs and Tenses", "Which is a verb?", ["Book", "Read", "Blue", "Slowly"], 1, "Read is an action."),
        ("Verbs and Tenses", "Past tense of 'go' is?", ["Goes", "Went", "Going", "Gone"], 1, "Went is past."),
        ("Verbs and Tenses", "Present tense of 'ate' is?", ["Eaten", "Eat", "Eating", "Ate"], 1, "Simple present is 'eat'."),
        ("Adjectives", "Which is an adjective?", ["Fast", "Cat", "Ram", "Sit"], 0, "Fast describes."),
        ("Adjectives", "In 'red ball', which is adjective?", ["ball", "red", "the", "a"], 1, "Red describes ball."),
        ("Story Comprehension", "A story usually has?", ["Only pictures", "Beginning, middle, end", "Only end", "Only characters"], 1, "3 parts."),
        ("Story Comprehension", "The main person in a story is?", ["Narrator", "Character", "Author", "Reader"], 1, "Character."),
        ("Poem Understanding", "Poems often have?", ["Only prose", "Rhyme and rhythm", "Only long lines", "Numbers"], 1, "Rhyme and rhythm."),
        ("Sentence Formation", "A sentence starts with?", ["small letter", "Capital letter", "Number", "Symbol"], 1, "Capital letter."),
        ("Sentence Formation", "A sentence ends with?", ["Comma", "Full stop", "Space", "Nothing"], 1, "Full stop / ? / !"),
        ("Letter Writing", "A friendly letter starts with?", ["To Sir", "Dear ___,", "Hi Boss", "Respected"], 1, "Dear ___,"),
    ]
    question_docs = []
    for tname, q, opts, corr, exp in Q:
        topic = topics_by_name[tname]
        question_docs.append({
            "id": nid(),
            "topic_id": topic["id"],
            "subject_id": topic["subject_id"],
            "question": q,
            "options": opts,
            "correct_index": corr,
            "explanation": exp,
        })
    await db.questions.insert_many(question_docs)

    # ---------- Users (demo credentials) ----------
    # 1 School Admin, 1 Company Admin, 1 Government, 3 teachers, 15 students, 3 parents
    users = []
    # School admin
    users.append({"id": nid(), "role": "school_admin", "email": "school@demo.com", "password_hash": _DEMO_HASH,
                  "name": "Principal Meera Sharma", "school_id": demo_school["id"]})
    users.append({"id": nid(), "role": "company_admin", "email": "company@demo.com", "password_hash": _DEMO_HASH,
                  "name": "Anita Rao (EduSense HQ)"})
    users.append({"id": nid(), "role": "government", "email": "gov@demo.com", "password_hash": _DEMO_HASH,
                  "name": "Dr. Rajesh Kumar (Dept. of Education)"})

    # Teachers (3 for demo school, subject-mapped)
    teachers_seed = [
    {"name": "Ms. Priya Verma", "email": "teacher@demo.com", "subject": math},
    {"name": "Mr. Anil Gupta", "email": "teacher2@demo.com", "subject": science},
    {"name": "Ms. Kavita Nair", "email": "teacher3@demo.com", "subject": english},
    {"name": "Ms. Sunita Sharma", "email": "teacher4@demo.com", "subject": hindi},
    {"name": "Mr. Rahul Mehta", "email": "teacher5@demo.com", "subject": sports},
     ]
    teachers = []
    for t in teachers_seed:
        u = {
            "id": nid(), "role": "teacher", "email": t["email"], "password_hash": _DEMO_HASH,
            "name": t["name"], "school_id": demo_school["id"], "class_id": class5["id"],
            "subject_id": t["subject"]["id"], "subject_name": t["subject"]["name"],
        }
        users.append(u)
        teachers.append(u)

    # Students (15)
    student_names = [
        "Aarav Singh", "Ishita Meena", "Kabir Yadav", "Diya Sharma", "Rohan Kumar",
        "Meera Devi", "Vikram Rao", "Ananya Joshi", "Aditya Patil", "Sara Khan",
        "Yash Bhati", "Zara Ali", "Neha Choudhary", "Arjun Rathi", "Pooja Meghwal",
    ]
    students = []
    badge_pool = ["First Quiz", "3-Day Streak", "Fraction Explorer", "Science Star", "Grammar Guru", "Home Learner"]
    for i, name in enumerate(student_names):
        u = {
            "id": nid(),
            "role": "student",
            "email": f"student{i+1}@demo.com" if i > 0 else "student@demo.com",
            "password_hash": _DEMO_HASH,
            "name": name,
            "school_id": demo_school["id"],
            "class_id": class5["id"],
            "class_label": "Class 5",
            "streak_days": random.randint(0, 12),
            "badges": random.sample(badge_pool, k=random.randint(1, 4)),
            "avatar_color": random.choice(["sky", "amber", "rose", "emerald", "violet"]),
        }
        users.append(u)
        students.append(u)

    # Parents (3, linked to 3 students)
    parent_names = ["Suresh Singh (Aarav's father)", "Reena Meena (Ishita's mother)", "Vinod Yadav (Kabir's father)"]
    for i, pname in enumerate(parent_names):
        p = {
            "id": nid(), "role": "parent",
            "email": f"parent{i+1}@demo.com" if i > 0 else "parent@demo.com",
            "password_hash": _DEMO_HASH,
            "name": pname, "child_id": students[i]["id"],
        }
        users.append(p)

    await db.users.insert_many(users)

    # ---------- Teaching records + activities + scores (last 10 days) ----------
    topic_by_subject = {}
    for t in topic_docs:
        topic_by_subject.setdefault(t["subject_id"], []).append(t)

    teaching_records = []
    learning_activities = []
    understanding_scores = []
    home_sessions = []

    for day in range(10, -1, -1):
        # each teacher teaches 1 topic per day
        for teacher in teachers:
            topic = random.choice(topic_by_subject[teacher["subject_id"]])
            tr = {
                "id": nid(),
                "class_id": class5["id"],
                "subject_id": teacher["subject_id"],
                "chapter_id": topic["chapter_id"],
                "topic_id": topic["id"],
                "teacher_id": teacher["id"],
                "taught_at": days_ago(day),
                "notes": "Class held. Whiteboard + examples.",
            }
            teaching_records.append(tr)
            # For each student, activity + understanding score (with realistic distribution)
            for st in students:
                learning_activities.append({
                    "id": nid(),
                    "student_id": st["id"],
                    "topic_id": topic["id"],
                    "chapter_id": topic["chapter_id"],
                    "subject_id": teacher["subject_id"],
                    "source": "school",
                    "date": days_ago(day),
                })
                # skew scores per student to make weak topics visible
                base = random.randint(35, 90)
                if "Fractions" in topic["name"] or "Addition of Fractions" == topic["name"]:
                    base = random.randint(20, 65)
                if "Grammar" in topic["chapter_id"]:
                    base = random.randint(30, 75)
                score = max(10, min(100, base + random.randint(-10, 10)))
                understanding_scores.append({
                    "id": nid(),
                    "student_id": st["id"],
                    "topic_id": topic["id"],
                    "subject_id": teacher["subject_id"],
                    "score": score,
                    "correct": round(score / 20),
                    "total": 5,
                    "date": days_ago(day),
                    "source": "quiz",
                })
        # some home sessions
        for st in random.sample(students, k=6):
            t = random.choice(topic_docs)
            home_sessions.append({
                "id": nid(),
                "student_id": st["id"],
                "topic_id": t["id"],
                "mode": random.choice(["explain", "example", "easier", "practice"]),
                "user_message": "Home revision demo",
                "ai_response": "Explained with a story about rotis and cricket runs.",
                "date": days_ago(day),
                "duration_min": random.randint(5, 20),
            })

    await db.teaching_records.insert_many(teaching_records)
    await db.learning_activities.insert_many(learning_activities)
    await db.understanding_scores.insert_many(understanding_scores)
    await db.home_sessions.insert_many(home_sessions)

    # ---------- Pending assessment for demo student ----------
    demo_student = students[0]
    # pick 2 weak topics for demo pending assessment
    weak_topics_for_demo = [topics_by_name["Addition of Fractions"], topics_by_name["Equivalent Fractions"]]
    demo_qs = []
    for wt in weak_topics_for_demo:
        qs = [q for q in question_docs if q["topic_id"] == wt["id"]]
        demo_qs.extend(random.sample(qs, k=min(3, len(qs))))
    await db.assessments.insert_one({
        "id": nid(),
        "student_id": demo_student["id"],
        "created_at": now_iso_local(),
        "status": "pending",
        "difficulty": "easy",
        "reasons": [
            {"topic": "Addition of Fractions", "subject": "Mathematics", "avg": 32.0,
             "questions_count": 3, "reason": "Weak in this topic (avg 32.0%). Added 3 targeted questions."},
            {"topic": "Equivalent Fractions", "subject": "Mathematics", "avg": 45.0,
             "questions_count": 3, "reason": "Weak in this topic (avg 45.0%). Added 3 targeted questions."},
        ],
        "questions": demo_qs,
        "total_questions": len(demo_qs),
    })

    # Additional schools' student data for company/government aggregation
    for sc, cls in zip(other_schools, classes_others):
        extra_students = []
        for i in range(8):
            u = {
                "id": nid(), "role": "student",
                "email": f"s_{sc['code'].lower()}_{i}@demo.com",
                "password_hash": _DEMO_HASH,
                "name": f"Student {i+1} of {sc['code']}",
                "school_id": sc["id"], "class_id": cls["id"], "class_label": "Class 5",
                "streak_days": random.randint(0, 8), "badges": [],
                "avatar_color": "sky",
            }
            extra_students.append(u)
        await db.users.insert_many(extra_students)

        # Add extra teacher + records
        et = {
            "id": nid(), "role": "teacher",
            "email": f"t_{sc['code'].lower()}@demo.com", "password_hash": _DEMO_HASH,
            "name": f"Teacher of {sc['code']}",
            "school_id": sc["id"], "class_id": cls["id"],
            "subject_id": math["id"], "subject_name": "Mathematics",
        }
        await db.users.insert_one(et)

        recs = []
        acts = []
        scr = []
        for day in range(8, -1, -1):
            topic = random.choice(topic_docs)
            recs.append({
                "id": nid(), "class_id": cls["id"], "subject_id": topic["subject_id"],
                "chapter_id": topic["chapter_id"], "topic_id": topic["id"],
                "teacher_id": et["id"], "taught_at": days_ago(day), "notes": "",
            })
            for st in extra_students:
                acts.append({
                    "id": nid(), "student_id": st["id"], "topic_id": topic["id"],
                    "chapter_id": topic["chapter_id"], "subject_id": topic["subject_id"],
                    "source": "school", "date": days_ago(day),
                })
                # give some schools weaker scores (simulate needing support)
                if sc["code"] == "AGS-004":
                    base = random.randint(25, 55)
                else:
                    base = random.randint(45, 85)
                scr.append({
                    "id": nid(), "student_id": st["id"], "topic_id": topic["id"],
                    "subject_id": topic["subject_id"], "score": base,
                    "correct": round(base/20), "total": 5, "date": days_ago(day), "source": "quiz",
                })
        await db.teaching_records.insert_many(recs)
        await db.learning_activities.insert_many(acts)
        await db.understanding_scores.insert_many(scr)

    print("Seed complete.")


def now_iso_local():
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    asyncio.run(seed())
