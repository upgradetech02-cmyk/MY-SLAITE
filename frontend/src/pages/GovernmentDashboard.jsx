import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AdultLayout from "@/components/AdultLayout";
import StatCard from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { Landmark, BookMarked, Users, Activity, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function GovernmentDashboard() {
  const [d, setD] = useState(null);
  const { t } = useTranslation();
  useEffect(() => { api.get("/government/overview").then((r) => setD(r.data)); }, []);
  if (!d) return <AdultLayout title="Loading…" />;

  return (
    <AdultLayout
      title={t("gov.title")}
      subtitle={t("gov.subtitle")}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label={t("gov.schools_monitored")} value={d.schools_monitored} icon={Landmark} testid="gov-stat-schools" />
        <StatCard label={t("gov.students")} value={d.students} icon={Users} accent="emerald" />
        <StatCard label={t("gov.teaching_records")} value={d.teaching_records} icon={BookMarked} accent="amber" />
        <StatCard label={t("school.participation")} value={`${d.participation}%`} icon={Activity} accent="rose" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6">
        <div className="flex justify-between mb-2">
          <h3 className="font-semibold adult-heading text-base">{t("gov.curriculum")}</h3>
          <span className="text-sm text-slate-500">{d.curriculum_progress}%</span>
        </div>
        <Progress value={d.curriculum_progress} className="h-2" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("gov.subject_outcomes")}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.subject_outcomes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("gov.trend")}</h3>
          {d.trend.length > 1 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={d.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-sm text-slate-500">{t("gov.trend_hint")}</div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="regional-table">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("gov.regional")}</h3>
          <Table>
            <TableHeader><TableRow><TableHead>{t("company.region")}</TableHead><TableHead>{t("company.schools")}</TableHead><TableHead>{t("company.avg")}</TableHead></TableRow></TableHeader>
            <TableBody>
              {d.regional.map((r) => (
                <TableRow key={r.region}>
                  <TableCell className="font-medium">{r.region || t("company.unknown")}</TableCell>
                  <TableCell>{r.schools}</TableCell>
                  <TableCell>{r.avg}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="flagged-schools">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert size={18} className="text-rose-600" />
            <h3 className="font-semibold adult-heading text-base">{t("gov.flagged")}</h3>
          </div>
          <div className="text-xs text-slate-500 mb-3">
            {t("gov.flagged_hint")}
          </div>
          {d.schools_flagged.length === 0 ? (
            <div className="text-sm text-slate-500">{t("gov.no_flagged")}</div>
          ) : (
            <ul className="space-y-3">
              {d.schools_flagged.map((s) => (
                <li key={s.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.region}</div>
                    </div>
                    <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">{t("teacher.needs_support")}</Badge>
                  </div>
                  <div className="text-xs text-slate-600 mt-2">{s.reason}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Teaching activity: {s.indicators.teaching_activity} · Participation: {s.indicators.participation_pct}% · Avg: {s.indicators.avg_performance}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdultLayout>
  );
}
