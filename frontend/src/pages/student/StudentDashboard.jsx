import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, loadSession } from "@/lib/api";
import KidLayout from "@/components/KidLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import {
  Flame,
  Sparkles,
  BookOpen,
  Trophy,
  Rocket,
  Bot,
  ClipboardList,
  ArrowRight,
  Star,
  AlertCircle,
} from "lucide-react";

const SUBJECT_TINT = {
  Mathematics: "kids-tile-sky",
  Science: "kids-tile-emerald",
  English: "kids-tile-rose",
};

export default function StudentDashboard() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const { user } = loadSession() || {};
  const [today, setToday] = useState([]);
  const [profile, setProfile] = useState(null);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get(`/students/${user.id}/today`).then((r) => setToday(r.data));
    api.get(`/students/${user.id}/profile`).then((r) => setProfile(r.data));
    api.get(`/students/${user.id}/upcoming-assessments`).then((r) => setUpcoming(r.data));
  }, [user?.id]);

  const primaryTopic = today?.[0];
return (
  <KidLayout
   title={
  <div className="flex items-center gap-4">
    <span>
      {t("student.hi_name", { name: user?.name })}
    </span>

    <span className="font-sans font-black text-sky-600 tracking-tight">
      CLASS 5
    </span>
  </div>
}
   subtitle={t("student.subtitle")}
    right={
        <div className="hidden md:flex items-center gap-3">
          <div className="kids-card px-4 py-2 flex items-center gap-2" data-testid="streak-widget">
            <Flame className="text-amber-500" size={20} />
            <div>
              <div className="text-xs text-slate-500">{t("student.streak")}</div>
              <div className="font-bold text-lg">{profile?.streak_days ?? 0} {t("student.days")}</div>
            </div>
          </div>
          <div className="kids-card px-4 py-2 flex items-center gap-2">
            <Star className="text-sky-500" size={20} />
            <div>
              <div className="text-xs text-slate-500">{t("student.overall")}</div>
              <div className="font-bold text-lg">{profile?.overall_score ?? 0}%</div>
            </div>
          </div>
        </div>
      }
    >
      {/* WHAT I STUDIED TODAY */}
      <section className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="kids-heading text-2xl font-bold">{t("student.what_studied")}</h2>
          <span className="text-sm text-slate-500">{today.length} topic(s)</span>
        </div>

        {today.length === 0 ? (
          <div className="kids-card p-6 text-slate-500">
            {t("student.no_lessons")}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {today.map((a) => (
              <div
                key={a.id}
                className={`kids-card p-5 ${SUBJECT_TINT[a.subject?.name] || "kids-tile-sky"}`}
                data-testid={`today-topic-${a.topic?.id}`}
              >
                <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                  <BookOpen size={14} /> {a.subject?.name}
                </div>
                <div className="kids-heading text-xl font-bold mt-2">{a.topic?.name}</div>
                <div className="text-sm text-slate-600 mt-1 line-clamp-2">{a.topic?.description}</div>
                <div className="flex gap-2 mt-4">
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-full text-xs"
                    onClick={() => nav(`/student/tutor/${a.topic?.id}`)}
                    data-testid={`continue-learning-${a.topic?.id}`}
                  >
                    {t("student.continue_learning")}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full text-xs bg-white/70 border-slate-300"
                    onClick={() => nav(`/student/quiz/${a.topic?.id}`)}
                    data-testid={`revise-today-${a.topic?.id}`}
                  >
                    {t("student.revise")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {primaryTopic && (
          <div
            className="kids-card mt-4 p-5 bg-white border-2 border-sky-100 flex flex-col md:flex-row md:items-center gap-4"
            data-testid="ai-tutor-cta"
          >
            <div className="w-12 h-12 rounded-2xl bg-sky-500 grid place-items-center text-white pulse-ring">
              <Bot size={22} />
            </div>
            <div className="flex-1">
              <div className="kids-heading text-lg font-bold">
                {t("student.ai_cta_line", { topic: primaryTopic.topic?.name })}
              </div>
              <div className="text-sm text-slate-600">
                {t("student.ai_cta_sub")}
              </div>
            </div>
            <Button
              className="bg-sky-500 hover:bg-sky-600 rounded-full"
              onClick={() => nav(`/student/tutor/${primaryTopic.topic?.id}`)}
              data-testid="ask-ai-tutor-btn"
            >
              {t("student.ask_ai_tutor")} <ArrowRight size={16} className="ml-1" />
            </Button>
          </div>
        )}
      </section>

      {/* MY PROGRESS + WEAK TOPICS */}
      <section className="grid md:grid-cols-2 gap-4 mb-8">
        <div
          onClick={() => nav("/student/profile")}
          className="kids-card p-5 cursor-pointer hover:shadow-md transition-all duration-200"
>
          <div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
    <Rocket className="text-sky-500" size={20} />
    <h3 className="kids-heading text-lg font-bold">
      {t("student.my_progress")}
    </h3>
  </div>

  <span className="text-xs font-semibold text-sky-600">
    View Details →
  </span>
</div>

<div className="space-y-3">
  {(profile?.subjects || []).map((s) => (
    <div key={s.id}>
      <div className="flex justify-between text-sm">
        <span className="font-medium">{s.name}</span>
        <span className="text-slate-500">{s.avg}%</span>
      </div>

      <Progress value={s.avg} className="h-3 mt-1" />
    </div>
  ))}

  {(profile?.subjects || []).length === 0 && (
    <div className="text-sm text-slate-500">
      Take a quiz to see your progress.
    </div>
  )}
</div>
</div>

        <div className="kids-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="text-rose-500" size={20} />
            <h3 className="kids-heading text-lg font-bold">{t("student.weak_topics_heading")}</h3>
          </div>
          {(profile?.weak_topics || []).length === 0 ? (
            <div className="text-sm text-slate-500">{t("student.doing_well")}</div>
          ) : (
            <ul className="space-y-2">
              {profile.weak_topics.map((topic) => (
                <li
                  key={topic.id}
                  onClick={() => nav(`/student/tutor/${topic.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-50/70 border border-rose-100 cursor-pointer hover:bg-rose-100 hover:border-rose-200 hover:shadow-sm transition-all duration-200"
                  data-testid={`weak-topic-${topic.id}`}
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {topic.name}
                    </div>

                    <div className="text-xs text-slate-500">
                      {topic.subject} · {topic.avg}%
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      nav(`/student/tutor/${topic.id}`);
                    }}
                    data-testid={`practice-weak-${topic.id}`}
                  >
                   {t("student.practice")}
                 </Button>
               </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* UPCOMING + BADGES */}
      <section className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="kids-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="text-amber-600" size={20} />
            <h3 className="kids-heading text-lg font-bold">{t("student.upcoming")}</h3>
          </div>
          {(upcoming || []).length === 0 ? (
            <div className="text-sm text-slate-500 mb-3">{t("student.no_pending")}</div>
          ) : (
            <div className="mb-3">
              {upcoming.slice(0, 1).map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="text-xs uppercase tracking-widest text-amber-700 font-semibold">
                    {t("adaptive.title")} · {a.difficulty}
                  </div>
                  <div className="font-semibold mt-1">{a.total_questions} {t("student.questions")}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {t("student.focused_weak")}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 rounded-full"
            onClick={() => nav("/student/adaptive-test")}
            data-testid="generate-personalized-test-btn"
          >
            <Sparkles size={16} className="mr-1" /> {t("student.generate_test")}
          </Button>
        </div>

        <div className="kids-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="text-amber-500" size={20} />
            <h3 className="kids-heading text-lg font-bold">{t("student.my_badges")}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile?.badges || []).map((b, i) => (
              <Badge key={i} className="bg-amber-100 text-amber-800 hover:bg-amber-100 rounded-full px-3 py-1">
                <Star size={12} className="mr-1" /> {b}
              </Badge>
            ))}
            {(profile?.badges || []).length === 0 && (
              <div className="text-sm text-slate-500">{t("student.earn_badges")}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div>
              <div className="text-2xl font-bold">{profile?.completed_topics || 0}</div>
              <div className="text-xs text-slate-500">{t("student.topics_done")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{profile?.home_sessions || 0}</div>
              <div className="text-xs text-slate-500">{t("student.ai_sessions")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{profile?.time_spent_min || 0}m</div>
              <div className="text-xs text-slate-500">{t("student.learning_time")}</div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full mt-4 rounded-full"
            onClick={() => nav("/student/profile")}
            data-testid="view-full-profile-btn"
          >
            {t("student.view_profile")}
          </Button>
        </div>
      </section>
    </KidLayout>
  );
}
