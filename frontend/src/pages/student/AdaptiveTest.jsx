import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, loadSession } from "@/lib/api";
import KidLayout from "@/components/KidLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowLeft, CheckCircle2, XCircle, Target } from "lucide-react";
import { toast } from "sonner";

export default function AdaptiveTest() {
  const nav = useNavigate();
  const { user } = loadSession() || {};
  const { t } = useTranslation();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { data } = await api.post("/adaptive-test/generate", { student_id: user.id });
      setTest(data);
      setAnswers({});
      setResult(null);
    } catch (e) {
      toast.error("Could not generate test");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    try {
      const { data } = await api.post("/adaptive-test/submit", {
        test_id: test.id,
        student_id: user.id,
        answers: test.questions.map((q) => ({ question_id: q.id, selected_index: answers[q.id] ?? -1 })),
      });
      setResult(data);
      toast.success(`Score: ${data.score}%`);
    } catch (e) {
      toast.error("Could not submit");
    } finally {
      setLoading(false);
    }
  }

  const back = (
    <Button variant="outline" size="sm" onClick={() => nav("/student")} className="rounded-full" data-testid="adaptive-back-btn">
      <ArrowLeft size={14} className="mr-1" /> {t("common.back")}
    </Button>
  );

  if (!test) {
    return (
      <KidLayout title={t("adaptive.title")} subtitle={t("adaptive.subtitle_adaptive")} right={back}>
        <div className="kids-card p-6 max-w-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 grid place-items-center text-white">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="kids-heading font-bold text-lg">{t("adaptive.ready")}</div>
              <div className="text-sm text-slate-600">{t("adaptive.ready_sub")}</div>
            </div>
          </div>
          <Button
            className="mt-6 rounded-full bg-amber-500 hover:bg-amber-600"
            onClick={generate}
            disabled={loading}
            data-testid="generate-personalized-test-btn"
          >
            {loading ? t("adaptive.generating") : t("adaptive.generate")}
          </Button>
        </div>
      </KidLayout>
    );
  }

  if (result) {
    return (
      <KidLayout title={t("adaptive.complete")} subtitle={t("adaptive.overall_score", { score: result.score })} right={back}>
        <div className="kids-card p-6 mb-4 max-w-xl">
          <div className="text-slate-600 text-sm">
            {t("adaptive.updated", { correct: result.correct, total: result.total })}
          </div>
        </div>
        <div className="space-y-3">
          {result.detail.map((d, i) => (
            <div key={i} className={`kids-card p-4 ${d.is_correct ? "border-emerald-200" : "border-rose-200"}`}>
              <div className="flex items-start gap-2">
                {d.is_correct ? <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={18} /> : <XCircle className="text-rose-500 shrink-0 mt-1" size={18} />}
                <div className="flex-1">
                  <div className="font-medium">{d.question}</div>
                  <div className="text-sm mt-1"><span className="text-slate-500">{t("quiz.correct")}</span><span className="font-medium">{d.options[d.correct_index]}</span></div>
                  <div className="text-xs text-slate-500 mt-1 italic">{d.explanation}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-6 rounded-full" onClick={() => nav("/student")} data-testid="adaptive-back-home">{t("quiz.back_dashboard")}</Button>
      </KidLayout>
    );
  }

  const pct = (Object.keys(answers).length / test.questions.length) * 100;

  return (
    <KidLayout
      title={t("adaptive.title")}
      subtitle={`${t("student.hi_name", { name: user?.name })} · ${t("adaptive.difficulty")}: ${test.difficulty}`}
      right={back}
    >
      <div className="kids-card p-5 mb-4 border-amber-200">
        <div className="flex items-center gap-2 mb-2">
          <Target className="text-amber-600" size={18} />
          <div className="font-bold kids-heading">{t("adaptive.why_questions")}</div>
        </div>
        <ul className="space-y-1 text-sm text-slate-700">
          {test.reasons.map((r, i) => (
            <li key={i} data-testid={`test-reason-${i}`}>
              <span className="font-medium">{r.topic}</span> ({r.subject}) — {r.reason}
            </li>
          ))}
        </ul>
        <div className="text-xs text-slate-500 mt-2">
          {test.total_questions} {t("adaptive.based_on")}
        </div>
      </div>

      <Progress value={pct} className="h-3 mb-4" />

      <div className="space-y-4">
        {test.questions.map((q, idx) => (
          <div key={q.id} className="kids-card p-5" data-testid={`adaptive-q-${idx}`}>
            <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
              {t("quiz.question")} {idx + 1}
            </div>
            <div className="kids-heading text-lg font-bold mt-1">{q.question}</div>
            <div className="grid md:grid-cols-2 gap-2 mt-3">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [q.id]: i })}
                    className={`text-left p-3 rounded-xl border-2 text-sm transition-all ${
                      selected
                        ? "border-amber-500 bg-amber-50"
                        : "border-slate-200 hover:border-amber-300 bg-white"
                    }`}
                    data-testid={`adaptive-q${idx}-option-${i}`}
                  >
                    <span className="font-mono text-slate-400 mr-2">{String.fromCharCode(65 + i)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Button
          className="rounded-full bg-amber-500 hover:bg-amber-600"
          disabled={Object.keys(answers).length < test.questions.length || loading}
          onClick={submit}
          data-testid="adaptive-submit-btn"
        >
          {loading ? t("quiz.submitting") : t("adaptive.submit_test")}
        </Button>
      </div>
    </KidLayout>
  );
}
