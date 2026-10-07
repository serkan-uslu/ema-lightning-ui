"use client";
import { Folder, Languages, Zap } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { translateBackend } from "@/i18n";
import {
  PageHeading,
  Panel,
  Segmented,
  SettingLine,
} from "@/components/molecules";
import { LanguageSwitch } from "@/components/organisms";
import { RequireData } from "@/components/templates/AppShell";

export function SettingsView() {
  const { t } = useI18n();
  const { sidebarCollapsed, toggleSidebar } = useShell();
  const { health } = useStudioData();
  const s = t.settings;
  const model = health?.model.status;
  return (
    <>
      <PageHeading eyebrow={s.eyebrow} title={s.title} lead={s.lead} />
      <div className="settings-grid">
        <Panel icon={Languages} title={s.interface} className="settings-panel">
          <SettingLine
            label={s.language}
            value={<LanguageSwitch size="md" />}
          />
          <SettingLine
            label={s.sidebar}
            value={
              <Segmented
                label={s.sidebar}
                value={sidebarCollapsed ? "collapsed" : "expanded"}
                onChange={(v) =>
                  (v === "collapsed") !== sidebarCollapsed && toggleSidebar()
                }
                options={[
                  { value: "expanded", label: s.sidebarExpanded },
                  { value: "collapsed", label: s.sidebarCollapsed },
                ]}
              />
            }
          />
        </Panel>
        <RequireData>
          <Panel icon={Zap} title={t.engine.name} className="settings-panel">
            <SettingLine
              label={s.modelStatus}
              value={
                model === "ready"
                  ? s.statusReady
                  : model === "error"
                    ? s.statusError
                    : s.statusLoading
              }
            />
            <SettingLine
              label={s.device}
              value={health?.model.device.toUpperCase()}
            />
            <SettingLine label={s.voice} value={s.voiceValue} />
            <SettingLine label={s.rates} value="8 / 16 / 24 / 48 kHz" />
            {health?.model.error && (
              <p className="error-text">
                {translateBackend(health.model.error, t)}
              </p>
            )}
            <p className="footnote">{s.modelNote}</p>
          </Panel>
          <Panel icon={Folder} title={s.data} className="settings-panel">
            <span className="field-label">{s.dataPath}</span>
            <code className="data-path">{health?.data_path}</code>
            <p className="footnote">{s.dataNote}</p>
            <SettingLine
              label={s.renderTools}
              value={health?.render_available ? s.renderOk : s.renderMissing}
            />
            <SettingLine label={s.version} value={health?.version} />
            <p className="footnote">{s.offlineNote}</p>
          </Panel>
        </RequireData>
      </div>
    </>
  );
}
