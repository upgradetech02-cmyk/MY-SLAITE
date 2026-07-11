import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import LanguageToggle from "@/components/LanguageToggle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (pw1 !== pw2) {
      toast.error(t("reset.mismatch"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw1 });
      toast.success(t("reset.success"));
      nav("/login");
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
          <h1 className="kids-heading text-2xl font-bold">{t("reset.heading")}</h1>
          <form onSubmit={submit} className="mt-5 space-y-4" data-testid="reset-form">
            <div>
              <label className="text-xs text-slate-500">{t("common.new_password")}</label>
              <Input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} minLength={6} required data-testid="reset-pw1" />
            </div>
            <div>
              <label className="text-xs text-slate-500">{t("common.confirm_password")}</label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={6} required data-testid="reset-pw2" />
            </div>
            <Button type="submit" disabled={loading || !token} className="w-full bg-sky-500 hover:bg-sky-600 rounded-xl h-11" data-testid="reset-submit">
              {loading ? t("common.loading") : t("common.reset_password")}
            </Button>
            {!token && (
              <div className="text-sm text-rose-600">Missing reset token in URL.</div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
