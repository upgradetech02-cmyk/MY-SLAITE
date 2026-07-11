import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, saveSession, formatApiError, ROLE_HOME } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import LanguageToggle from "@/components/LanguageToggle";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  Users,
  School,
  Building2,
  Landmark,
  BookOpenCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const ROLE_CARDS = [
  { key: "student", icon: BookOpenCheck, tint: "kids-tile-sky", desc_key: "student_desc" },
  { key: "teacher", icon: GraduationCap, tint: "kids-tile-amber", desc_key: "teacher_desc" },
  { key: "parent", icon: Users, tint: "kids-tile-rose", desc_key: "parent_desc" },
  { key: "school_admin", icon: School, tint: "kids-tile-emerald", desc_key: "school_admin_desc" },
  { key: "company_admin", icon: Building2, tint: "kids-tile-violet", desc_key: "company_admin_desc" },
  { key: "government", icon: Landmark, tint: "kids-tile-sky", desc_key: "government_desc" },
];

const ROLE_DESC = {
  student_desc: { en: "Learn, revise, quiz", hi: "पढ़ो, दोहराओ, क्विज़" },
  teacher_desc: { en: "Record & track class", hi: "कक्षा दर्ज व ट्रैक करें" },
  parent_desc: { en: "Track your child", hi: "अपने बच्चे को देखें" },
  school_admin_desc: { en: "Manage your school", hi: "स्कूल प्रबंधन" },
  company_admin_desc: { en: "Platform overview", hi: "प्लेटफ़ॉर्म अवलोकन" },
  government_desc: { en: "District analytics", hi: "ज़िला विश्लेषण" },
};

export default function Login() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("hi") ? "hi" : "en";
  const [demoAccounts, setDemoAccounts] = useState({});
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo123");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/auth/demo-accounts").then((r) => setDemoAccounts(r.data)).catch(() => {});
  }, []);

  async function submit(e) {
    e?.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      saveSession(data.user, data.token);
      toast.success(t("login.welcome", { name: data.user.name }));
      nav(ROLE_HOME[data.user.role] || "/");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  function pickAccount(u) {
    setEmail(u.email);
    setPassword("demo123");
  }

  function googleLogin() {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/login";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  }

  return (
    <div className="kids-theme min-h-screen bg-slate-50 flex flex-col">
      <div className="border-b border-sky-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500 grid place-items-center text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="kids-heading font-bold text-xl">{t("common.app_name")}</div>
              <div className="text-xs text-slate-500 -mt-0.5">{t("common.tagline")}</div>
            </div>
          </div>
          <LanguageToggle variant="kids" />
        </div>
      </div>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-6 py-8 grid md:grid-cols-[1fr_400px] gap-8">
        <div>
          <h1 className="kids-heading text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
            {t("login.heading_top")}<br />
            <span className="text-sky-600">{t("login.heading_bottom")}</span>
          </h1>
          <p className="text-slate-600 mt-4 text-lg max-w-lg">
            {t("login.pick_role")}{" "}
            <code className="bg-slate-200 rounded px-1.5 py-0.5 text-sm">demo123</code>.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8" data-testid="role-selector">
            {ROLE_CARDS.map((r) => {
              const Icon = r.icon;
              const accounts = demoAccounts[r.key] || [];
              const active = role === r.key;
              return (
                <button
                  key={r.key}
                  onClick={() => {
                    setRole(r.key);
                    if (accounts[0]) pickAccount(accounts[0]);
                  }}
                  className={`kids-card p-4 text-left ${active ? "ring-4 ring-sky-300" : ""}`}
                  data-testid={`role-card-${r.key}`}
                >
                  <div className={`w-12 h-12 rounded-2xl ${r.tint} grid place-items-center mb-3`}>
                    <Icon size={22} className="text-slate-800" />
                  </div>
                  <div className="font-semibold text-slate-900">{t(`roles.${r.key}`)}</div>
                  <div className="text-xs text-slate-500 mt-1">{ROLE_DESC[r.desc_key][lang]}</div>
                  {accounts.length > 0 && (
                    <div className="text-[11px] text-slate-400 mt-2">
                      {accounts.length} demo{accounts.length > 1 ? "s" : ""}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Card className="p-6 rounded-2xl border-2 border-slate-100 bg-white h-fit">
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">{t("common.sign_in")}</div>
              <div className="kids-heading text-2xl font-bold mt-1">
                {role ? t(`roles.${role}`) : t("login.choose_role")}
              </div>
            </div>

            {role && demoAccounts[role]?.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">{t("login.demo_accounts")}</div>
                <div className="flex flex-wrap gap-2">
                  {demoAccounts[role].map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => pickAccount(u)}
                      className={`text-xs px-3 py-1.5 rounded-full border ${
                        email === u.email ? "bg-sky-500 text-white border-sky-500" : "border-slate-200 hover:border-sky-300"
                      }`}
                      data-testid={`demo-account-${u.email}`}
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500">{t("common.email")}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="login-email-input" />
            </div>
            <div>
              <div className="flex justify-between">
                <label className="text-xs text-slate-500">{t("common.password")}</label>
                <Link to="/forgot-password" className="text-xs text-sky-600 hover:underline" data-testid="forgot-link">
                  {t("common.forgot_password")}
                </Link>
              </div>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" />
            </div>
            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-11 text-base"
              data-testid="login-submit-button"
            >
              {loading ? t("common.loading") : (<span className="inline-flex items-center gap-2">{t("common.continue")} <ArrowRight size={16} /></span>)}
            </Button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-xs uppercase text-slate-400"><span className="bg-white px-2">{t("common.or")}</span></div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={googleLogin}
              className="w-full rounded-xl h-11 border-slate-300"
              data-testid="google-login-btn"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" className="mr-2">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {t("common.continue_with_google")}
            </Button>

            <div className="text-xs text-center text-slate-500">
              {t("common.dont_have_account")}{" "}
              <Link to="/signup" className="text-sky-600 hover:underline" data-testid="signup-link">{t("common.sign_up")}</Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
