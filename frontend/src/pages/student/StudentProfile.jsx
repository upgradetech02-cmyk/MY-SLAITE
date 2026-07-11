import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, loadSession } from "@/lib/api";
import KidLayout from "@/components/KidLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Flame, Star, Trophy, TrendingUp, ArrowLeft } from "lucide-react";

export default function StudentProfile() {
  const nav = useNavigate();
  const { studentId } = useParams();
  const { user } = loadSession() || {};
  const { t } = useTranslation();
  const [p, setP] = useState(null);

  useEffect(() => {
  const targetStudentId = studentId || user?.id;
  if (targetStudentId) {
    api.get(`/students/${targetStudentId}/profile`).then((r) => setP(r.data));
  }
}, [studentId, user?.id]);

  if (!p) return <KidLayout title={t("common.loading")} />;

  return (
    <KidLayout
      title={t("profile.title")}
      subtitle={`${p.student.class_label} · ${p.student.name}`}
      right={
        <Button variant="outline" size="sm" onClick={() => nav(studentId ? "/teacher" : "/student")} className="rounded-full" data-testid="profile-back-btn">
          <ArrowLeft size={14} className="mr-1" /> {t("common.back")}
        </Button>
      }
    >
      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <div className="kids-card p-4 flex items-center gap-3">
          <Flame className="text-amber-500" />
          <div>
            <div className="text-xs text-slate-500">{t("student.streak")}</div>
            <div className="font-bold text-xl">{p.streak_days} {t("student.days")}</div>
          </div>
        </div>
        <div className="kids-card p-4 flex items-center gap-3">
          <Star className="text-sky-500" />
          <div>
            <div className="text-xs text-slate-500">{t("student.overall")}</div>
            <div className="font-bold text-xl">{p.overall_score}%</div>
          </div>
        </div>
        <div className="kids-card p-4 flex items-center gap-3">
          <Trophy className="text-emerald-500" />
          <div>
            <div className="text-xs text-slate-500">{t("profile.topics_done_label")}</div>
            <div className="font-bold text-xl">{p.completed_topics}/{p.total_topics}</div>
          </div>
        </div>
        <div className="kids-card p-4 flex items-center gap-3">
          <TrendingUp className="text-rose-500" />
          <div>
            <div className="text-xs text-slate-500">{t("profile.home_sessions_label")}</div>
            <div className="font-bold text-xl">{p.home_sessions}</div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="kids-card p-5">
          <h3 className="kids-heading font-bold text-lg mb-3">{t("profile.improvement")}</h3>
          {p.trend.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={p.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-500">Complete more quizzes to see your journey.</div>
          )}
        </div>

        <div className="kids-card p-5">
          <h3 className="kids-heading font-bold text-lg mb-3">{t("profile.subject_performance")}</h3>
          <div className="space-y-3">
            {p.subjects.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate-500">{s.avg}% · {s.attempts} attempts</span>
                </div>
                <Progress value={s.avg} className="h-3 mt-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="kids-card p-5">
          <h3 className="kids-heading font-bold text-lg mb-3">{t("profile.strong_topics")}</h3>
          <div className="flex flex-wrap gap-2">
            {p.strong_topics.length === 0 && <div className="text-sm text-slate-500">{t("profile.keep_practicing")}</div>}
            {p.strong_topics.map((tp) => (
              <Badge key={tp.id} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 rounded-full px-3 py-1">
                {tp.name} · {tp.avg}%
              </Badge>
            ))}
          </div>
        </div>

        <div className="kids-card p-5">
  <h3 className="kids-heading font-bold text-lg mb-3">
    {t("profile.weak_topics")}
  </h3>

  <div className="space-y-3">
    {p.weak_topics.length === 0 && (
      <div className="text-sm text-slate-500">
        {t("profile.great_no_weak")}
      </div>
    )}

    {p.weak_topics.map((tp) => (
      <button
        key={tp.id}
        type="button"
        onClick={() => nav(`/student/tutor/${tp.id}`)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50 hover:bg-rose-100 transition-all duration-200 cursor-pointer text-left"
      >
        <div>
          <div className="font-semibold text-slate-800">
            {tp.name}
          </div>

          <div className="text-xs text-slate-500 mt-1">
            {tp.subject} · {tp.attempts} attempts
          </div>
        </div>

        <div className="font-bold text-rose-600">
          {tp.avg}%
        </div>
      </button>
    ))}
    </div>
</div>

      </div>
    </KidLayout>
  );
}
