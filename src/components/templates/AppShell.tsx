"use client";
import type { ReactNode } from "react";
import { useAudioPlayer } from "@/controls/AudioPlayerProvider";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { Button, Spinner } from "../atoms";
import { Notice } from "../molecules";
import { NewProjectModal, PlayerBar, Sidebar, Topbar } from "../organisms";

/** Persistent frame: navigation, notices, the shared player and dialogs. */
export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { sidebarCollapsed } = useShell();
  const { error, clearError, loaded, connected, refresh, busy } =
    useStudioData();
  const { current } = useAudioPlayer();
  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "is-collapsed" : ""} ${current ? "has-player" : ""}`}
    >
      <Sidebar />
      <div className="main-shell">
        <Topbar />
        <main id="main">
          {error && (
            <Notice onDismiss={clearError} dismissLabel={t.common.close}>
              {error}
            </Notice>
          )}
          {loaded && !connected && (
            <Notice
              action={
                <Button size="sm" onClick={() => refresh()}>
                  {t.common.retry}
                </Button>
              }
            >
              {t.errors.serviceDown}
            </Notice>
          )}
          {children}
        </main>
        <footer className="page-footer">
          <span>
            EMA Studio <i aria-hidden="true" /> {t.footer.left}
          </span>
          <span>{t.footer.right}</span>
        </footer>
      </div>
      {busy && (
        <div className="working-toast" role="status">
          <Spinner />
          {t.common.saving}
        </div>
      )}
      <PlayerBar />
      <NewProjectModal />
    </div>
  );
}

/**
 * Shows a loader until the first sync. Once data has arrived, views stay
 * mounted while offline so unsaved edits and scroll position survive.
 */
export function RequireData({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { loaded, hasData } = useStudioData();
  if (!loaded && !hasData)
    return (
      <div className="loading">
        <Spinner size={24} />
        <span>{t.common.loading}</span>
      </div>
    );
  return hasData ? <>{children}</> : null;
}
