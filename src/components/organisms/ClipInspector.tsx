"use client";
import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import type { MontageEditor } from "@/controls/useMontageEditor";
import type { ClipFit } from "@/lib/types";
import { Field, Panel } from "../molecules";

export function ClipInspector({ editor }: { editor: MontageEditor }) {
  const { t } = useI18n();
  const m = t.montage;
  const clip = editor.selected;
  const source = editor.selectedSource;
  return (
    <Panel
      icon={SlidersHorizontal}
      title={m.clipSettings}
      className="inspector-panel"
    >
      {clip ? (
        <>
          <div className="selected-clip">
            <span className="eyebrow">{m.kinds[clip.kind]}</span>
            <strong>{clip.label}</strong>
          </div>
          <Field label={m.start}>
            <input
              type="number"
              min={0}
              step={0.1}
              value={Number(clip.start.toFixed(3))}
              onChange={(e) =>
                editor.patchSelected({ start: Number(e.target.value) })
              }
            />
          </Field>
          {clip.kind !== "image" && (
            <Field label={m.trim}>
              <input
                type="number"
                min={0}
                step={0.1}
                value={Number(clip.trim.toFixed(3))}
                onChange={(e) =>
                  editor.patchSelected({ trim: Number(e.target.value) })
                }
              />
            </Field>
          )}
          <Field label={m.duration}>
            <input
              type="number"
              min={0.04}
              step={0.1}
              value={Number(clip.duration.toFixed(3))}
              onChange={(e) =>
                editor.patchSelected({ duration: Number(e.target.value) })
              }
            />
          </Field>
          {clip.kind !== "image" && (
            <div className="field">
              <span className="field-label field-label-split">
                <span>{m.volume}</span>
                <output className="mono accent">
                  {Math.round(clip.volume * 100)}%
                </output>
              </span>
              <input
                aria-label={m.volume}
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={clip.volume}
                onChange={(e) =>
                  editor.patchSelected({ volume: Number(e.target.value) })
                }
              />
            </div>
          )}
          {clip.kind !== "audio" && (
            <Field label={m.fit}>
              <select
                value={clip.fit}
                onChange={(e) =>
                  editor.patchSelected({ fit: e.target.value as ClipFit })
                }
              >
                <option value="cover">{m.fitCover}</option>
                <option value="contain">{m.fitContain}</option>
              </select>
            </Field>
          )}
          <p className="hint">
            {source && clip.kind !== "image"
              ? `${m.sourceDuration(source.duration.toFixed(2))} `
              : ""}
            {m.nonDestructive}
          </p>
          {editor.overflow && <p className="error-text">{m.overflow}</p>}
        </>
      ) : (
        <p className="hint">{m.pickClip}</p>
      )}
    </Panel>
  );
}
