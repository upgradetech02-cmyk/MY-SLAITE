import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, loadSession, API_BASE } from "@/lib/api";
import KidLayout from "@/components/KidLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { Bot, Send, Sparkles, Repeat, Lightbulb, Baby, Dumbbell, ArrowLeft } from "lucide-react";

const MODE_BUTTONS = [
  { key: "explain", label_key: "tutor.explain_again", icon: Repeat },
  { key: "example", label_key: "tutor.another_example", icon: Lightbulb },
  { key: "easier", label_key: "tutor.make_easier", icon: Baby },
  { key: "practice", label_key: "tutor.practice_topic", icon: Dumbbell },
];

function currentTutorLanguage(language) {
  if (language?.startsWith("hi")) return "hi";
  if (language?.startsWith("te")) return "te";
  return "en";
}

export default function AITutor() {
  const { topicId } = useParams();
  const nav = useNavigate();
  const { user } = loadSession() || {};
  const { t, i18n } = useTranslation();
  const [topic, setTopic] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const initSent = useRef(false);

  useEffect(() => {
    if (topicId) {
      api.get(`/curriculum`).then((r) => {
        for (const s of r.data) {
          for (const c of s.chapters) {
            for (const t of c.topics) {
              if (t.id === topicId) {
                setTopic({ ...t, subjectName: s.name, chapterName: c.name });
              }
            }
          }
        }
      });
    }
  }, [topicId]);

  useEffect(() => {
    // seed with explain on first load
    if (topicId && !initSent.current) {
      initSent.current = true;
      sendMessage("", "explain");
    }
  }, [topicId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text, mode = "chat") {
    if (streaming) return;
    const userMsg = text || (mode === "explain" ? "Explain this topic to me." : mode === "example" ? "Give me another example." : mode === "easier" ? "Make it easier." : mode === "practice" ? "Give me practice questions." : "");
    if (mode === "chat" && !text.trim()) return;

    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setStreaming(true);

    // append empty AI message and fill via SSE
    setMessages((m) => [...m, { role: "ai", content: "" }]);

    try {
      const resp = await fetch(`${API_BASE}/tutor/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.id,
          topic_id: topicId || null,
          message: text || "",
          mode,
          language: currentTutorLanguage(i18n.language),
        }),
      });
      if (!resp.body) throw new Error("No stream");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() || "";
        for (const chunk of parts) {
          const line = chunk.replace(/^data:\s*/, "").trim();
          if (!line) continue;
          try {
            const evt = JSON.parse(line);
            if (evt.type === "delta") {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: copy[copy.length - 1].content + evt.content,
                };
                return copy;
              });
            }
          } catch (_e) {
            // ignore malformed line
          }
        }
      }
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "ai", content: "Sorry, I could not connect. Please try again." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <KidLayout
      title={topic ? topic.name : "AI Tutor"}
      subtitle={topic ? `${topic.subjectName} · ${topic.chapterName}` : t("tutor.chat_prompt")}
      right={
        <Button
          variant="outline"
          size="sm"
          onClick={() => nav(-1)}
          className="rounded-full"
          data-testid="tutor-back-btn"
        >
          <ArrowLeft size={14} className="mr-1" /> Back
        </Button>
      }
    >
      <div className="kids-card p-4 md:p-6" data-testid="ai-tutor-panel">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-2xl bg-sky-500 grid place-items-center text-white pulse-ring">
            <Bot size={22} />
          </div>
          <div>
            <div className="font-bold kids-heading text-lg">Buddy</div>
            <div className="text-xs text-slate-500">{t("tutor.friendly_ai")}</div>
          </div>
        </div>

        <div className="mt-4 max-h-[420px] overflow-y-auto pr-1 space-y-3" data-testid="tutor-messages">
          {messages.length === 0 && (
            <div className="text-slate-500 text-sm">{t("tutor.say_hello")}</div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`tutor-msg-${i}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl whitespace-pre-wrap text-[15px] leading-relaxed ${
                  m.role === "user"
                    ? "bg-amber-100 text-slate-800 rounded-br-sm"
                    : "bg-sky-50 text-slate-800 rounded-bl-sm"
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {MODE_BUTTONS.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.key}
                onClick={() => sendMessage("", b.key)}
                disabled={streaming}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border-2 border-sky-100 text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                data-testid={`tutor-btn-${b.key}`}
              >
                <Icon size={14} className="inline mr-1 -mt-0.5" /> {t(b.label_key)}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input, "chat");
          }}
          className="flex gap-2 mt-4"
          data-testid="tutor-input-form"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("tutor.ask_placeholder")}
            className="rounded-full"
            disabled={streaming}
            data-testid="tutor-input"
          />
          <Button
            type="submit"
            className="rounded-full bg-sky-500 hover:bg-sky-600"
            disabled={streaming || !input.trim()}
            data-testid="tutor-send-btn"
          >
            <Send size={16} />
          </Button>
        </form>
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          className="bg-amber-500 hover:bg-amber-600 rounded-full"
          onClick={() => nav(`/student/quiz/${topicId}`)}
          data-testid="tutor-take-quiz-btn"
          disabled={!topicId}
        >
          <Sparkles size={14} className="mr-1" /> Take a quick quiz on this
        </Button>
      </div>
    </KidLayout>
  );
}
