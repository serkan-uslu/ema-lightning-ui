"use client";
import { useState } from "react";
import { AudioLines, Check, Settings2 } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import type { ProjectEditor } from "@/controls/useProjectEditor";
import { formatKhz } from "@/lib/format";
import { SAMPLE_RATES, SPEED_RANGE } from "@/lib/project";
import type { Project } from "@/lib/types";
import { Field, Panel } from "../molecules";

export function ProjectSettingsPanel({
  project,
  editor,
}: {
  project: Project;
  editor: ProjectEditor;
}) {
  const { t } = useI18n();
  const s = t.projectSettings;
  // Live slider value while dragging; null shows the saved value.
  const [speed, setSpeed] = useState<number | null>(null);
  const shownSpeed = speed ?? project.speed;
  const commitSpeed = () => {
    if (speed !== null && speed !== project.speed)
      editor.updateProject({ speed }).then(() => setSpeed(null));
    else setSpeed(null);
  };

  return (
    <Panel icon={Settings2} title={s.title} className="inspector-panel">
      <div className="voice-card">
        <span className="voice-icon" aria-hidden="true">
          <AudioLines size={22} />
        </span>
        <span>
          <strong>{t.engine.name}</strong>
          <small>{s.voice}</small>
        </span>
        <Check size={14} className="accent" aria-hidden="true" />
      </div>
      <div className="field">
        <span className="field-label field-label-split">
          <span>{s.speed}</span>
          <output className="mono accent">{shownSpeed.toFixed(2)}×</output>
        </span>
        <input
          aria-label={s.speed}
          type="range"
          min={SPEED_RANGE.min}
          max={SPEED_RANGE.max}
          step={SPEED_RANGE.step}
          value={shownSpeed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          onPointerUp={commitSpeed}
          onKeyUp={commitSpeed}
        />
        <span className="range-labels" aria-hidden="true">
          <span>0.25×</span>
          <span>{s.speedNormal}</span>
          <span>4×</span>
        </span>
      </div>
      <Field label={s.sampleRate}>
        <select
          value={project.sample_rate}
          onChange={(e) =>
            editor.updateProject({ sample_rate: Number(e.target.value) })
          }
        >
          {SAMPLE_RATES.map((rate) => (
            <option key={rate} value={rate}>
              {formatKhz(rate)} {rate === 48000 ? `· ${s.studio}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <SeedField
        key={String(project.seed)}
        seed={project.seed}
        editor={editor}
      />
      <p className="hint">{s.hint}</p>
    </Panel>
  );
}

function SeedField({
  seed,
  editor,
}: {
  seed: number | null;
  editor: ProjectEditor;
}) {
  const { t } = useI18n();
  const [value, setValue] = useState(seed?.toString() ?? "");
  return (
    <Field label={t.projectSettings.seed} hint={t.projectSettings.seedHint}>
      <input
        type="number"
        min={0}
        max={Number.MAX_SAFE_INTEGER}
        placeholder={t.projectSettings.random}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const next = value === "" ? null : Number(value);
          if (next !== seed) editor.updateProject({ seed: next });
        }}
      />
    </Field>
  );
}
