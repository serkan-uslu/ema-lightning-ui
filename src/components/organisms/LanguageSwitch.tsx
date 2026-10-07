"use client";
import { useI18n } from "@/controls/I18nProvider";
import type { Locale } from "@/i18n/config";
import { Segmented } from "../molecules";

export function LanguageSwitch({ size = "sm" }: { size?: "sm" | "md" }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <Segmented<Locale>
      size={size}
      label={t.topbar.language}
      value={locale}
      onChange={setLocale}
      options={[
        { value: "tr", label: "TR", title: "Türkçe" },
        { value: "en", label: "EN", title: "English" },
      ]}
    />
  );
}
