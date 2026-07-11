import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, loadSession } from "@/lib/api";
import KidLayout from "@/components/KidLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, ArrowLeft, Sparkles } from "lucide-react";

export default function StudentQuiz() {
  const { topicId } = useParams();
  const { user } = loadSession() || {};
  const { t } = useTranslation();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/quiz/topic/${topicId}`).then((r) => setQuiz(r.data));
  }, [topicId]);

  if (!quiz) return <KidLayout title={t("common.loading")} />;

  const pct = (Object.keys(answers).length / quiz.questions.length) * 100;

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        student_id: user.id,
        topic_id: topicId,
        subject_id: quiz.topic.subject_id,
        answers: quiz.questions.map((q) => ({
          question_id: q.id,
          selected_index: answers[q.id] ?? -1,
        })),
      };
      const { data } = await api.post("/quiz/submit", payload);
      setResult(data);
      toast.success(`${data.score}%`);
    } catch (err) {
      toast.error("Could not submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <KidLayout title={t("quiz.great_effort")} subtitle={t("quiz.scored", { score: result.score, topic: quiz.topic.name })}>
        <div className="kids-card p-6 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-500 grid place-items-center text-white">
              <Sparkles size={26} />
            </div>
            <div>
              <div className="kids-heading text-3xl font-bold">{result.score}%</div>
              <div className="text-slate-600 text-sm">{t("quiz.correct_of_total", { correct: result.correct, total: result.total })}</div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {result.detail.map((d, i) => (
            <div
              key={i}
              className={`kids-card p-4 ${d.is_correct ? "border-emerald-200" : "border-rose-200"}`}
              data-testid={`quiz-review-${i}`}
            >
              <div className="flex items-start gap-2">
                {d.is_correct ? (
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={18} />
                ) : (
                  <XCircle className="text-rose-500 shrink-0 mt-1" size={18} />
                )}
                <div className="flex-1">
                  <div className="font-medium">{d.question}</div>
                  <div className="text-sm mt-1">
                    <span className="text-slate-500">{t("quiz.correct")}</span>
                    <span className="font-medium">{d.options[d.correct_index]}</span>
                  </div>
                  {!d.is_correct && (
                    <div className="text-sm text-slate-500 mt-1">
                      {t("quiz.you_chose")}{d.selected_index >= 0 ? d.options[d.selected_index] : "—"}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 mt-1 italic">{d.explanation}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            className="bg-sky-500 hover:bg-sky-600 rounded-full"
            onClick={() => nav(`/student/tutor/${topicId}`)}
            data-testid="ask-tutor-after-quiz"
          >
            {t("quiz.learn_ai_tutor")}
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => nav("/student")}
            data-testid="back-home-btn"
          >
            {t("quiz.back_dashboard")}
          </Button>
        </div>
      </KidLayout>
    );
  }

  return (
    <KidLayout title={quiz.topic.name} subtitle={t("quiz.check_5")}>
      <div className="mb-4">
        <Progress value={pct} className="h-3" />
        <div className="text-xs text-slate-500 mt-1">
          {t("quiz.of_answered", { done: Object.keys(answers).length, total: quiz.questions.length })}
        </div>
      </div>

      <div className="space-y-4">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="kids-card p-5" data-testid={`quiz-question-${idx}`}>
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
                        ? "border-sky-500 bg-sky-50"
                        : "border-slate-200 hover:border-sky-300 bg-white"
                    }`}
                    data-testid={`quiz-q${idx}-option-${i}`}
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

      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => nav(-1)}
          data-testid="quiz-back-btn"
        >
          <ArrowLeft size={16} className="mr-1" /> {t("common.back")}
        </Button>
        <Button
          className="bg-sky-500 hover:bg-sky-600 rounded-full"
          disabled={Object.keys(answers).length < quiz.questions.length || submitting}
          onClick={submit}
          data-testid="quiz-submit-btn"
        >
          {submitting ? t("quiz.submitting") : t("quiz.submit")}
        </Button>
      </div>
    </KidLayout>
  );
}
