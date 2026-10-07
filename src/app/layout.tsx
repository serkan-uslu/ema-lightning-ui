import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/templates/AppShell";
import { AudioPlayerProvider } from "@/controls/AudioPlayerProvider";
import { DraftsProvider } from "@/controls/DraftsProvider";
import { I18nProvider } from "@/controls/I18nProvider";
import { ShellProvider } from "@/controls/ShellProvider";
import { StudioDataProvider } from "@/controls/StudioDataProvider";
import { dictionaries } from "@/i18n";
import { defaultLocale, isLocale } from "@/i18n/config";
import { LOCALE_COOKIE, SIDEBAR_COOKIE } from "@/lib/preferences";
import "./globals.css";

async function readPreferences() {
  const store = await cookies();
  const locale = store.get(LOCALE_COOKIE)?.value;
  return {
    locale: isLocale(locale) ? locale : defaultLocale,
    collapsed: store.get(SIDEBAR_COOKIE)?.value === "collapsed",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await readPreferences();
  return dictionaries[locale].meta;
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { locale, collapsed } = await readPreferences();
  return (
    <html lang={locale}>
      <body>
        <I18nProvider initialLocale={locale}>
          <ShellProvider initialCollapsed={collapsed}>
            <StudioDataProvider>
              <DraftsProvider>
                <AudioPlayerProvider>
                  <AppShell>{children}</AppShell>
                </AudioPlayerProvider>
              </DraftsProvider>
            </StudioDataProvider>
          </ShellProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
