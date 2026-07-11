import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, saveSession, formatApiError, ROLE_HOME } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LanguageToggle from "@/components/LanguageToggle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function Signup() {
  const nav = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "parent" });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      saveSession(data.user, data.token);
      toast.success(t("signup.success"));
      nav(ROLE_HOME[data.user.role] || "/");
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
            <div>
              <div className="kids-heading font-bold text-xl">{t("common.app_name")}</div>
              <div className="text-xs text-slate-500 -mt-0.5">{t("common.tagline")}</div>
            </div>
          </Link>
          <LanguageToggle variant="kids" />
        </div>
      </div>

      <div className="flex-1 grid place-items-center px-4 py-10">
        <Card className="w-full max-w-md p-6 rounded-2xl border-2 border-slate-100">
          <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("common.sign_up")}</div>
          <h1 className="kids-heading text-2xl font-bold mt-1">{t("signup.heading")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("signup.subtitle")}</p>

          <form onSubmit={submit} className="space-y-4 mt-5" data-testid="signup-form">
            <div>
              <label className="text-xs text-slate-500">{t("common.full_name")}</label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required data-testid="signup-name" />
            </div>
            <div>
              <label className="text-xs text-slate-500">{t("common.email")}</label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required data-testid="signup-email" />
            </div>
            <div>
              <label className="text-xs text-slate-500">{t("common.password")}</label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} minLength={6} required data-testid="signup-password" />
            </div>
            <div>
              <label className="text-xs text-slate-500">{t("common.role")}</label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger data-testid="signup-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">{t("roles.parent")}</SelectItem>
                  <SelectItem value="teacher">{t("roles.teacher")}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-400 mt-1">{t("signup.role_hint")}</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-sky-500 hover:bg-sky-600 rounded-xl h-11" data-testid="signup-submit">
              {loading ? t("common.loading") : t("common.sign_up")}
            </Button>
            <div className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
              <ArrowLeft size={12} />
              <Link to="/login" className="text-sky-600 hover:underline">{t("common.already_have_account")} {t("common.sign_in")}</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
