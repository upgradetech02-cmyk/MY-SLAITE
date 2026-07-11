import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, loadSession } from "@/lib/api";
import AdultLayout from "@/components/AdultLayout";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ClipboardCheck, TrendingDown, BookMarked, Check } from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export default function TeacherDashboard() {
  const { user } = loadSession() || {};
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!user) return;
    api.get(`/teacher/${user.id}/overview`).then((r) => setOverview(r.data));
    api.get(`/curriculum`).then((r) => {
      setCurriculum(r.data);
      // default to teacher's own subject if any
      const teacherSubj = r.data.find((s) => s.name === user.subject_name);
      if (teacherSubj) setSubject(teacherSubj.id);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user || !overview?.class_id) return;
    api
      .get(`/teaching-records`, { params: { class_id: overview.class_id, teacher_id: user.id, days: 14 } })
      .then((r) => setRecent(r.data));
  }, [user?.id, overview?.class_id, saving]);

  const subjectObj = curriculum.find((s) => s.id === subject);
  const chapterObj = subjectObj?.chapters.find((c) => c.id === chapter);

  async function markTaught() {
    if (!topic || !chapter || !subject) return;
    setSaving(true);
    try {
      await api.post("/teaching-records", {
        class_id: overview.class_id,
        subject_id: subject,
        chapter_id: chapter,
        topic_id: topic,
        teacher_id: user.id,
        notes: "",
      });
      toast.success(t("teacher.saved_toast"));
      setTopic("");
      // reload overview
      const r = await api.get(`/teacher/${user.id}/overview`);
      setOverview(r.data);
    } catch (e) {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdultLayout
      title={t("teacher.welcome", { name: user?.name })}
      subtitle={t("teacher.subtitle", { subject: user?.subject_name || "Class 5" })}
    >
      {/* Record Today's Teaching */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6" data-testid="record-teaching-panel">
        <div className="flex items-center gap-2 mb-3">
          <BookMarked size={18} className="text-blue-600" />
          <h3 className="font-semibold adult-heading text-lg">{t("teacher.record_teaching")}</h3>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500">{t("teacher.subject")}</label>
            <Select value={subject} onValueChange={(v) => { setSubject(v); setChapter(""); setTopic(""); }}>
              <SelectTrigger data-testid="select-subject"><SelectValue placeholder={t("teacher.choose")} /></SelectTrigger>
              <SelectContent>
                {curriculum.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500">{t("teacher.chapter")}</label>
            <Select value={chapter} onValueChange={(v) => { setChapter(v); setTopic(""); }} disabled={!subject}>
              <SelectTrigger data-testid="select-chapter"><SelectValue placeholder={t("teacher.choose")} /></SelectTrigger>
              <SelectContent>
                {(subjectObj?.chapters || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-500">{t("teacher.topic")}</label>
            <Select value={topic} onValueChange={setTopic} disabled={!chapter}>
              <SelectTrigger data-testid="select-topic"><SelectValue placeholder={t("teacher.choose")} /></SelectTrigger>
              <SelectContent>
                {(chapterObj?.topics || []).map((tp) => (
                  <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!topic || saving}
              onClick={markTaught}
              data-testid="mark-taught-btn"
            >
              <Check size={16} className="mr-1" /> {t("teacher.mark_taught")}
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label={t("teacher.students")} value={overview?.total_students ?? "—"} icon={Users} testid="stat-students" />
        <StatCard label={t("teacher.class_avg")} value={`${overview?.class_avg ?? 0}%`} icon={ClipboardCheck} accent="emerald" testid="stat-class-avg" />
        <StatCard label={t("teacher.struggling")} value={overview?.struggling_students?.length ?? 0} icon={TrendingDown} accent="rose" testid="stat-struggling" />
        <StatCard label={t("teacher.records_today")} value={overview?.records_today ?? 0} icon={BookMarked} accent="amber" testid="stat-records-today" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("teacher.topic_perf")}</h3>
          {(overview?.topic_performance || []).length === 0 ? (
            <div className="text-sm text-slate-500">No quiz data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(overview.topic_performance || []).slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avg" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-semibold adult-heading text-base mb-3">{t("teacher.recent_teaching")}</h3>
          <ul className="space-y-2 max-h-[260px] overflow-y-auto">
            {recent.length === 0 && <li className="text-sm text-slate-500">{t("teacher.no_records_week")}</li>}
            {recent.map((r) => (
              <li key={r.id} className="text-sm flex items-start gap-2 border-b border-slate-100 py-2 last:border-0">
                <Check size={14} className="text-emerald-500 mt-1" />
                <div>
                  <div className="font-medium">{r.subject?.name} — {r.topic?.name}</div>
                  <div className="text-xs text-slate-500">{r.chapter?.name} · {new Date(r.taught_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5 mb-6" data-testid="students-table">
        <h3 className="font-semibold adult-heading text-base mb-3">{t("teacher.students_in_class")}</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.full_name")}</TableHead>
                <TableHead>{t("teacher.class_avg")}</TableHead>
                <TableHead>{t("teacher.struggling")}</TableHead>
                <TableHead>{t("student.streak")}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview?.students || []).map((s) => (
                <TableRow
  key={s.id}
  data-testid={`student-row-${s.id}`}
  onClick={() => navigate(`/teacher/student/${s.id}`)}
  className="cursor-pointer hover:bg-slate-50"
>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.avg_score}%</TableCell>
                  <TableCell>{s.weak_topics_count}</TableCell>
                  <TableCell>{s.streak_days || 0}</TableCell>
                  <TableCell>
                    {s.avg_score < 55 ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">{t("teacher.needs_support")}</Badge>
                    ) : s.avg_score >= 75 ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{t("teacher.strong")}</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{t("teacher.on_track")}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdultLayout>
  );
}
