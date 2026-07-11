import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import AdultLayout from "@/components/AdultLayout";
import StatCard from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import { Building2, Users, GraduationCap, Activity, Layers, TrendingUp, ClipboardCheck } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function CompanyAdminDashboard() {
  const [d, setD] = useState(null);
  const { t } = useTranslation();
  useEffect(() => { api.get("/company/overview").then((r) => setD(r.data)); }, []);

  if (!d) return <AdultLayout title="Loading…" />;

  return (
    <AdultLayout title={t("company.title")} subtitle={t("company.subtitle")}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label={t("company.schools")} value={d.total_schools} icon={Building2} testid="co-stat-schools" />
        <StatCard label={t("company.students")} value={d.total_students} icon={Users} accent="emerald" />
        <StatCard label={t("company.teachers")} value={d.total_teachers} icon={GraduationCap} accent="amber" />
        <StatCard label={t("company.active_users")} value={d.active_users} icon={Activity} accent="rose" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label={t("company.learning_sessions")} value={d.learning_sessions} icon={Layers} accent="slate" />
        <StatCard label={t("company.assessments_done")} value={d.assessments_completed} icon={ClipboardCheck} accent="slate" />
        <StatCard label={t("company.avg_perf")} value={`${d.avg_performance}%`} icon={TrendingUp} accent="emerald" />
        <StatCard label={t("company.improvement_7d")} value={`${d.avg_learning_improvement >= 0 ? "+" : ""}${d.avg_learning_improvement}%`} icon={TrendingUp} accent={d.avg_learning_improvement >= 0 ? "emerald" : "rose"} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("company.school_performance")}</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={d.school_performance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("company.regional_analytics")}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("company.region")}</TableHead>
                <TableHead>{t("company.schools")}</TableHead>
                <TableHead>{t("company.avg")}</TableHead>
              </TableRow>
            </TableHeader>
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
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="font-semibold adult-heading text-base mb-3">{t("company.school_comparison")}</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("company.schools")}</TableHead>
              <TableHead>{t("company.region")}</TableHead>
              <TableHead>{t("company.students")}</TableHead>
              <TableHead>{t("company.avg_perf")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {d.school_performance.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.region}</TableCell>
                <TableCell>{s.students}</TableCell>
                <TableCell>{s.avg}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AdultLayout>
  );
}
