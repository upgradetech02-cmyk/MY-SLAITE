import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import LanguageToggle from "@/components/LanguageToggle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setResetLink(data.reset_link || "");
      toast.success(t("forgot.sent"));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="kids-theme min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b border-sky-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 grid place-items-center text-white">
              <Sparkles size={20} />
            </div>
            <div className="kids-heading font-bold text-xl">{t("common.app_name")}</div>
          </Link>
          <LanguageToggle variant="kids" />
        </div>
      </div>

      <div className="flex-1 grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md p-6 rounded-2xl border-2 border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 grid place-items-center">
              <KeyRound className="text-amber-700" size={22} />
            </div>
            <div>
              <h1 className="kids-heading text-2xl font-bold">{t("forgot.heading")}</h1>
              <p className="text-sm text-slate-500">{t("forgot.subtitle")}</p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4" data-testid="forgot-form">
            <div>
              <label className="text-xs text-slate-500">{t("common.email")}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="forgot-email" />
            </div>
            <Button type="submit" disabled={loading || !email} className="w-full bg-sky-500 hover:bg-sky-600 rounded-xl h-11" data-testid="forgot-submit">
              {loading ? t("common.loading") : t("common.submit")}
            </Button>
          </form>

          {resetLink && (
            <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm">
              <div className="text-xs text-amber-800 mb-1 font-semibold">{t("forgot.dev_note")}</div>
              <a href={resetLink} className="text-sky-700 break-all underline" data-testid="reset-link-display">
                {resetLink}
              </a>
            </div>
          )}

          <div className="text-xs text-center text-slate-500 mt-4 flex items-center justify-center gap-1">
            <ArrowLeft size={12} />
            <Link to="/login" className="text-sky-600 hover:underline">{t("common.sign_in")}</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
