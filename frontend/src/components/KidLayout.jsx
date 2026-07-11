import { useNavigate } from "react-router-dom";
import { api, loadSession, clearSession } from "@/lib/api";
import LanguageToggle from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import { LogOut, Sparkles } from "lucide-react";

export default function KidLayout({ children, title, subtitle, right }) {
  const nav = useNavigate();
  const { t } = useTranslation();
  const session = loadSession();
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_e) { /* ignore */ }
    clearSession();
    nav("/login");
  };

  return (
    <div className="kids-theme min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-sky-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => nav("/student")}
            data-testid="kid-header-home"
          >
            <div className="w-11 h-11 rounded-2xl bg-sky-500 grid place-items-center text-white">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="kids-heading text-xl font-bold text-slate-900">
                {t("common.app_name")}
              </div>
              <div className="text-xs text-slate-500 -mt-0.5">{t("student.hi_name", { name: session?.user?.name?.split(" ")[0] || "friend" })}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle variant="kids" />
            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-500 hover:text-rose-500 text-sm"
              data-testid="kid-logout-btn"
            >
              <LogOut size={16} /> {t("common.sign_out")}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {(title || right) && (
          <div className="flex items-start justify-between mb-6">
            <div>
              {title && (
                <h1 className="kids-heading text-3xl md:text-4xl font-bold text-slate-900">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-slate-600 mt-1 text-base md:text-lg">{subtitle}</p>
              )}
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
