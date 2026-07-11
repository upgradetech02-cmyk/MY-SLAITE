import { useEffect, useState } from "react";
import { api, loadSession } from "@/lib/api";
import AdultLayout from "@/components/AdultLayout";
import StatCard from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Home,
  School,
  TrendingUp,
  Lightbulb,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function ParentDashboard() {
  const { user } = loadSession() || {};
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (user) api.get(`/parent/${user.id}/child`).then((r) => setData(r.data));
  }, [user?.id]);

  if (!data) return <AdultLayout title="Loading…" />;
  const { profile, today, home_activity, school_activity, monthly_progress, suggestions } = data;

  return (
    <AdultLayout title={t("parent.child", { name: profile.student.name })} subtitle={`${profile.student.class_label} · Sunrise Government Primary School`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label={t("parent.overall_score")} value={`${profile.overall_score}%`} icon={TrendingUp} testid="parent-stat-overall" />
        <StatCard label={t("parent.streak")} value={`${profile.streak_days} ${t("student.days")}`} icon={BookOpen} accent="amber" />
        <StatCard label={t("parent.school_activity")} value={school_activity} icon={School} accent="emerald" />
        <StatCard label={t("parent.home_revision")} value={home_activity} icon={Home} accent="rose" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6" data-testid="today-panel">
        <h3 className="font-semibold adult-heading text-base mb-3">{t("parent.studied_today")}</h3>
        {today.length === 0 ? (
          <div className="text-sm text-slate-500">No lessons recorded yet today.</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-3">
            {today.map((a) => (
              <div key={a.id} className="border border-slate-200 rounded-lg p-3">
                <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{a.subject?.name}</div>
                <div className="font-medium mt-1">{a.topic?.name}</div>
                <div className="text-xs text-slate-500 mt-1">{a.chapter?.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("parent.monthly_progress")}</h3>
          {monthly_progress.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthly_progress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-500">{t("parent.trend_hint")}</div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("parent.subject_performance")}</h3>
          <div className="space-y-3">
            {profile.subjects.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate-500">{s.avg}%</span>
                </div>
                <Progress value={s.avg} className="h-2 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("parent.strong_areas")}</h3>
          <div className="flex flex-wrap gap-2">
            {profile.strong_topics.length === 0 && <div className="text-sm text-slate-500">{t("parent.encouraging")}</div>}
            {profile.strong_topics.map((tp) => (
              <Badge key={tp.id} className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{tp.name} · {tp.avg}%</Badge>
            ))}
          </div>
          <h3 className="font-semibold adult-heading text-base mt-6 mb-3">{t("parent.weak_areas")}</h3>
          <div className="flex flex-wrap gap-2">
            {profile.weak_topics.length === 0 && <div className="text-sm text-slate-500">{t("parent.no_weak_now")}</div>}
            {profile.weak_topics.map((tp) => (
              <Badge key={tp.id} className="bg-rose-100 text-rose-800 hover:bg-rose-100">{tp.name} · {tp.avg}%</Badge>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="text-amber-600" size={18} />
            <h3 className="font-semibold adult-heading text-base">{t("parent.suggestions")}</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {suggestions.map((s, i) => (
              <li key={i} className="flex gap-2" data-testid={`parent-suggestion-${i}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AdultLayout>
  );
}
