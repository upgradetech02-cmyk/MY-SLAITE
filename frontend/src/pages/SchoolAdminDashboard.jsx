import { useEffect, useState } from "react";
import { api, loadSession } from "@/lib/api";
import AdultLayout from "@/components/AdultLayout";
import StatCard from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { Users, GraduationCap, Layers, Percent, AlertTriangle } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function SchoolAdminDashboard() {
  const { user } = loadSession() || {};
  const { t } = useTranslation();
  const [d, setD] = useState(null);

  useEffect(() => {
    if (user?.school_id) api.get(`/school/${user.school_id}/overview`).then((r) => setD(r.data));
  }, [user?.school_id]);

  if (!d) return <AdultLayout title="Loading…" />;

  return (
    <AdultLayout title={d.school.name} subtitle={t("school.subtitle_meta", { district: d.school.district, region: d.school.region, code: d.school.code })}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label={t("school.students")} value={d.total_students} icon={Users} testid="school-stat-students" />
        <StatCard label={t("school.teachers")} value={d.total_teachers} icon={GraduationCap} accent="amber" />
        <StatCard label={t("school.classes")} value={d.total_classes} icon={Layers} accent="emerald" />
        <StatCard label={t("school.avg_perf")} value={`${d.avg_performance}%`} icon={Percent} accent="slate" />
        <StatCard label={t("school.participation")} value={`${d.participation}%`} icon={AlertTriangle} accent="rose" />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold adult-heading text-base">{t("school.curriculum_progress")}</h3>
          <span className="text-sm text-slate-500">{d.curriculum_progress}%</span>
        </div>
        <Progress value={d.curriculum_progress} className="h-2" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("school.subject_perf")}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={d.subject_performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("school.class_perf")}</h3>
          {d.class_performance.length === 0 ? (
            <div className="text-sm text-slate-500">{t("school.no_data")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.class_performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="intervention-table">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("school.intervention")}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.full_name")}</TableHead>
                <TableHead>{t("school.classes")}</TableHead>
                <TableHead>{t("school.avg_perf")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.intervention_needed.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-slate-500">{t("school.on_track_all")}</TableCell></TableRow>
              ) : d.intervention_needed.slice(0, 10).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.class}</TableCell>
                  <TableCell className="text-rose-600">{s.avg}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("school.teacher_activity")}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.full_name")}</TableHead>
                <TableHead>{t("teacher.subject")}</TableHead>
                <TableHead>Records logged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.teacher_activity.map((tt) => (
                <TableRow key={tt.id}>
                  <TableCell className="font-medium">{tt.name}</TableCell>
                  <TableCell>{tt.subject}</TableCell>
                  <TableCell>{tt.records_logged}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdultLayout>
  );
}
