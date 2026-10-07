import type { Locale } from "@/i18n/config";

const intlLocale: Record<Locale, string> = { tr: "tr-TR", en: "en-US" };

/** mm:ss — used for every audio/video duration in the UI. */
export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatShortDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(intlLocale[locale], {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(iso: string, locale: Locale) {
  return new Date(iso).toLocaleTimeString(intlLocale[locale], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number, locale: Locale) {
  return value.toLocaleString(intlLocale[locale]);
}

export const formatKhz = (sampleRate: number) => `${sampleRate / 1000} kHz`;
