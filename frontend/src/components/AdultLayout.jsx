import { useNavigate, useLocation, Link } from "react-router-dom";
import { api, loadSession, clearSession } from "@/lib/api";
import LanguageToggle from "@/components/LanguageToggle";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  LogOut,
  GraduationCap,
  Users,
  School,
  Building2,
  Landmark,
  UserCircle2,
} from "lucide-react";

const ROLE_META = {
  teacher: { key: "teacher", icon: GraduationCap, home: "/teacher" },
  parent: { key: "parent", icon: Users, home: "/parent" },
  school_admin: { key: "school_admin", icon: School, home: "/school" },
  company_admin: { key: "company_admin", icon: Building2, home: "/company" },
  government: { key: "government", icon: Landmark, home: "/government" },
};

export default function AdultLayout({ children, title, subtitle, actions }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useTranslation();
  const session = loadSession();
  const role = session?.user?.role;
  const meta = ROLE_META[role] || {};
  const RoleIcon = meta.icon || LayoutDashboard;

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_e) { /* ignore */ }
    clearSession();
    nav("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white p-5 gap-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 grid place-items-center text-white font-bold">
            E
          </div>
          <div>
            <div className="font-semibold adult-heading text-lg leading-none">
              {t("common.app_name")}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {t("common.tagline")}
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1" data-testid="adult-sidebar">
          <Link
            to={meta.home || "/"}
            className={`sidebar-item ${loc.pathname === meta.home ? "active" : ""}`}
            data-testid="sidebar-home"
          >
            <RoleIcon size={18} /> <span>{t("common.dashboard")}</span>
          </Link>
        </nav>
        <div className="mt-auto text-xs text-slate-500 flex items-center gap-2">
          <UserCircle2 size={16} />
          <div>
            <div className="text-slate-800 text-sm font-medium">
              {session?.user?.name}
            </div>
            <div>{meta.key ? t(`roles.${meta.key}`) : ""}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600"
          data-testid="logout-btn"
        >
          <LogOut size={16} /> {t("common.sign_out")}
        </button>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold adult-heading text-slate-900">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <LanguageToggle />
            <button
              onClick={logout}
              className="md:hidden text-sm text-slate-600 hover:text-red-600 flex items-center gap-1"
              data-testid="logout-btn-mobile"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
