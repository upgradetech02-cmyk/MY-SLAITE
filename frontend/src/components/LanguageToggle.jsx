import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
  { code: "te", label: "తె" },
];

export default function LanguageToggle({ variant = "adult" }) {
  const { i18n, t } = useTranslation();
  const cur = LANGUAGES.find((lang) => i18n.language?.startsWith(lang.code))?.code || "en";
  const toggle = () => {
    const index = LANGUAGES.findIndex((lang) => lang.code === cur);
    i18n.changeLanguage(LANGUAGES[(index + 1) % LANGUAGES.length].code);
  };

  return (
    <button
      onClick={toggle}
      className={
        variant === "kids"
          ? "flex items-center gap-1.5 text-sm text-slate-600 hover:text-sky-600 px-3 py-1.5 rounded-full border border-slate-200 bg-white"
          : "flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white"
      }
      data-testid="language-toggle"
      title={t("common.language")}
    >
      <Globe size={14} />
      <span className="font-medium">{LANGUAGES.map((lang) => lang.label).join(" · ")}</span>
    </button>
  );
}
