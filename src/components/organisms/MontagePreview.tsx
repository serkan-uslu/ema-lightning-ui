"use client";
import { Player } from "@remotion/player";
import { Clapperboard, MonitorPlay } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import type {
  MontageEditor,
  MontagePlayerRef,
} from "@/controls/useMontageEditor";
import { formatClock } from "@/lib/format";
import { FPS } from "@/lib/project";
import type { Aspect } from "@/lib/types";
import { Movie, movieFrames } from "@/remotion/Composition";
import { StatusDot } from "../atoms";
import { Panel, Segmented } from "../molecules";

export function MontagePreview({
  editor,
  playerRef,
}: {
  editor: MontageEditor;
  playerRef: MontagePlayerRef;
}) {
  const { t } = useI18n();
  const m = t.montage;
  const { timeline, clips } = editor;
  const landscape = timeline.aspect === "16:9";
  return (
    <Panel
      icon={MonitorPlay}
      title={
        <span className="live-label">
          <StatusDot tone="online" />
          {m.preview}
        </span>
      }
      aside={
        <Segmented<Aspect>
          size="sm"
          label={m.aspect}
          value={timeline.aspect}
          onChange={editor.setAspect}
          options={[
            { value: "16:9", label: "16:9", title: m.landscape },
            { value: "9:16", label: "9:16", title: m.portrait },
          ]}
        />
      }
      className="preview-panel"
    >
      <div className={`preview-canvas ${landscape ? "" : "is-portrait"}`}>
        {clips.length ? (
          <Player
            ref={playerRef}
            component={Movie}
            inputProps={{ aspect: timeline.aspect, clips }}
            durationInFrames={movieFrames(clips)}
            fps={FPS}
            compositionWidth={landscape ? 1920 : 1080}
            compositionHeight={landscape ? 1080 : 1920}
            controls
            style={{ width: "100%", height: "100%" }}
            errorFallback={({ error }) => (
              <div className="preview-error">
                {t.errors.previewFailed(error.message)}
              </div>
            )}
          />
        ) : (
          <div className="preview-empty">
            <Clapperboard size={34} aria-hidden="true" />
            <strong>{m.emptyPreviewTitle}</strong>
            <span>{m.emptyPreviewText}</span>
          </div>
        )}
      </div>
      <div className="preview-meta">
        <span>{m.format}</span>
        <span className="mono">
          {formatClock(editor.seconds)} / {formatClock(editor.end)}
        </span>
      </div>
    </Panel>
  );
}
