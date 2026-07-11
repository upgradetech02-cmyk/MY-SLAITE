import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, saveSession, formatApiError, ROLE_HOME } from "@/lib/api";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function AuthCallback() {
  const nav = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : null;
    if (!sessionId) {
      nav("/login");
      return;
    }

    (async () => {
      try {
        const { data } = await api.post("/auth/google-session", { session_id: sessionId });
        saveSession(data.user, data.token);
        // Clear hash to avoid re-processing
        window.history.replaceState({}, "", window.location.pathname);
        toast.success(`Welcome, ${data.user.name}`);
        nav(ROLE_HOME[data.user.role] || "/");
      } catch (err) {
        toast.error(formatApiError(err));
        nav("/login");
      }
    })();
  }, [nav]);

  return (
    <div className="kids-theme min-h-screen grid place-items-center bg-slate-50">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-sky-500 grid place-items-center text-white mx-auto mb-3 pulse-ring">
          <Sparkles size={26} />
        </div>
        <div className="kids-heading text-lg font-bold">Signing you in…</div>
        <div className="text-sm text-slate-500 mt-1">Finishing Google authentication</div>
      </div>
    </div>
  );
}
