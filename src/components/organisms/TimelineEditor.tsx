"use client";
import type { DragEvent, KeyboardEvent } from "react";
import {
  AudioLines,
  ImagePlus,
  Scissors,
  Trash2,
  Video,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import type { MontageEditor } from "@/controls/useMontageEditor";
import { formatClock } from "@/lib/format";
import type { Clip } from "@/lib/types";
import { IconButton } from "../atoms";

const LANES = [
  { id: "visual", audio: false },
  { id: "audio", audio: true },
] as const;
const DRAG_TYPE = "application/x-ema-clip";

export function TimelineEditor({ editor }: { editor: MontageEditor }) {
  const { t } = useI18n();
  const m = t.montage;
  const pps = editor.pxPerSecond;
  const width = editor.visibleSeconds * pps;
  const tickEvery = pps >= 96 ? 1 : pps >= 48 ? 2 : 5;
  const ticks = Array.from(
    { length: Math.floor(editor.visibleSeconds / tickEvery) + 1 },
    (_, i) => i * tickEvery,
  );

  const onDrop = (laneAudio: boolean) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    const { id, offset } = JSON.parse(raw) as { id: string; offset: number };
    const clip = editor.timeline.clips.find((c) => c.id === id);
    if (!clip || (clip.kind === "audio") !== laneAudio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    editor.moveClip(id, (e.clientX - rect.left) / pps - offset);
  };

  const onClipKey = (clip: Clip) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 1 : 0.1;
    if (e.key === "ArrowLeft") editor.moveClip(clip.id, clip.start - step);
    else if (e.key === "ArrowRight")
      editor.moveClip(clip.id, clip.start + step);
    else if (e.key === "Delete" || e.key === "Backspace")
      editor.removeSelected();
    else return;
    e.preventDefault();
  };

  return (
    <section className="panel timeline-panel" aria-label={m.timeline}>
      <header className="timeline-toolbar">
        <div>
          <h3>{m.timeline}</h3>
          <span className="muted">
            {t.common.clipCount(editor.clips.length)}
          </span>
          {editor.dirty && <span className="unsaved">{m.unsaved}</span>}
        </div>
        <div>
          <IconButton
            label={m.zoomOut}
            disabled={!editor.canZoomOut}
            onClick={editor.zoomOut}
          >
            <ZoomOut size={17} />
          </IconButton>
          <IconButton
            label={m.zoomIn}
            disabled={!editor.canZoomIn}
            onClick={editor.zoomIn}
          >
            <ZoomIn size={17} />
          </IconButton>
          <span className="toolbar-divider" aria-hidden="true" />
          <IconButton
            label={m.split}
            disabled={!editor.selected}
            onClick={editor.split}
          >
            <Scissors size={17} />
          </IconButton>
          <IconButton
            label={m.removeClip}
            tone="danger"
            disabled={!editor.selected}
            onClick={editor.removeSelected}
          >
            <Trash2 size={17} />
          </IconButton>
        </div>
      </header>

      <div className="timeline-body">
        <div className="lane-labels" aria-hidden="true">
          <span className="ruler-spacer" />
          {LANES.map((lane) => (
            <span key={lane.id} className="lane-label">
              {lane.audio ? <AudioLines size={16} /> : <Video size={16} />}
              <small>{lane.audio ? m.laneAudio : m.laneVisual}</small>
            </span>
          ))}
        </div>
        <div className="timeline-scroll">
          <div className="timeline-track" style={{ width }}>
            <div
              className="time-ruler"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                editor.seekSeconds((e.clientX - rect.left) / pps);
              }}
            >
              {ticks.map((sec) => (
                <span key={sec} style={{ left: sec * pps }}>
                  {formatClock(sec)}
                </span>
              ))}
            </div>
            {LANES.map((lane) => (
              <div
                key={lane.id}
                className={`lane-content lane-${lane.id}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop(lane.audio)}
              >
                {editor.clips
                  .filter((c) => (c.kind === "audio") === lane.audio)
                  .map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        e.dataTransfer.setData(
                          DRAG_TYPE,
                          JSON.stringify({
                            id: clip.id,
                            offset: (e.clientX - rect.left) / pps,
                          }),
                        );
                        editor.select(clip.id);
                      }}
                      onKeyDown={onClipKey(clip)}
                      className={`timeline-clip clip-${clip.kind} ${editor.selected?.id === clip.id ? "is-selected" : ""} ${clip.src ? "" : "is-missing"}`}
                      style={{
                        left: clip.start * pps,
                        width: Math.max(8, clip.duration * pps),
                      }}
                      onClick={() => editor.select(clip.id)}
                      title={`${clip.label} · ${clip.duration.toFixed(2)} ${t.common.seconds}`}
                      aria-pressed={editor.selected?.id === clip.id}
                    >
                      <span aria-hidden="true">
                        {clip.kind === "audio" ? (
                          <AudioLines size={13} />
                        ) : clip.kind === "image" ? (
                          <ImagePlus size={13} />
                        ) : (
                          <Video size={13} />
                        )}
                      </span>
                      <strong>{clip.label}</strong>
                    </button>
                  ))}
              </div>
            ))}
            <div
              className="playhead"
              style={{ left: editor.seconds * pps }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
      <p className="hint timeline-hint">{m.timelineHint}</p>
    </section>
  );
}
