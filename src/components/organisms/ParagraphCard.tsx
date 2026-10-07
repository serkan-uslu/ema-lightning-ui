"use client";
import { useRef } from "react";
import {
  ArrowDown,
  ArrowUp,
  GitMerge,
  Scissors,
  Trash2,
  Zap,
} from "lucide-react";
import {
  useAudioPlayer,
  useTakePlayback,
} from "@/controls/AudioPlayerProvider";
import { useI18n } from "@/controls/I18nProvider";
import type { ProjectEditor } from "@/controls/useProjectEditor";
import { translateBackend } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { isActiveStatus, selectedTake, SPEED_PRESETS } from "@/lib/project";
import type { Paragraph, Take } from "@/lib/types";
import { Badge, Button, Checkbox, IconButton, Spinner } from "../atoms";
import { TakePreview } from "../molecules";

export function ParagraphCard({
  paragraph,
  index,
  count,
  projectSpeed,
  editor,
  playlist,
}: {
  paragraph: Paragraph;
  index: number;
  count: number;
  projectSpeed: number;
  editor: ProjectEditor;
  /** Selected takes of the project, so playback continues in order. */
  playlist: Take[];
}) {
  const { t, locale } = useI18n();
  const player = useAudioPlayer();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const take = selectedTake(paragraph);
  const playback = useTakePlayback(take?.id);
  const text = editor.textOf(paragraph.id);
  const number = index + 1;
  const working = isActiveStatus(paragraph.status);
  const { busy } = editor;

  return (
    <article
      className={[
        "paragraph-card",
        editor.focusedId === paragraph.id && "is-focused",
        playback.isCurrent && "is-playing",
        editor.checked.includes(paragraph.id) && "is-checked",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => editor.focus(paragraph.id)}
      onFocus={() => editor.focus(paragraph.id)}
    >
      <header className="paragraph-top">
        <div>
          <Checkbox
            label={t.editor.selectParagraph}
            checked={editor.checked.includes(paragraph.id)}
            onChange={() => editor.toggleChecked(paragraph.id)}
          />
          <span className="paragraph-number">
            {String(number).padStart(2, "0")}
          </span>
          <span className="paragraph-label">{t.editor.paragraph}</span>
          {playback.isCurrent && (
            <span className="now-playing">{t.editor.nowPlaying}</span>
          )}
        </div>
        <div>
          {working && <Spinner size={14} />}
          <Badge
            status={paragraph.status}
            label={t.status[paragraph.status] ?? paragraph.status}
          />
          <IconButton
            size="sm"
            label={t.editor.moveUp}
            disabled={index === 0 || busy}
            onClick={() => editor.move(index, -1)}
          >
            <ArrowUp size={14} />
          </IconButton>
          <IconButton
            size="sm"
            label={t.editor.moveDown}
            disabled={index === count - 1 || busy}
            onClick={() => editor.move(index, 1)}
          >
            <ArrowDown size={14} />
          </IconButton>
        </div>
      </header>

      <textarea
        ref={textarea}
        aria-label={t.editor.paragraphLabel(number)}
        value={text}
        maxLength={20000}
        onChange={(e) => editor.setDraft(paragraph.id, e.target.value)}
        onBlur={() => editor.commitText(paragraph.id)}
        placeholder={t.editor.placeholder}
        rows={Math.max(2, Math.min(8, Math.ceil(text.length / 90)))}
      />

      <footer className="paragraph-bottom">
        <div className="paragraph-meta">
          <span>{t.common.characters(formatNumber(text.length, locale))}</span>
          <label className="inline-select">
            {t.editor.speed}
            <select
              aria-label={t.editor.speedLabel(number)}
              value={paragraph.speed ?? "inherit"}
              onChange={(e) =>
                editor.updateParagraph(paragraph.id, {
                  speed:
                    e.target.value === "inherit"
                      ? null
                      : Number(e.target.value),
                })
              }
            >
              <option value="inherit">
                {t.editor.inheritSpeed(projectSpeed)}
              </option>
              {SPEED_PRESETS.map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="paragraph-actions">
          <IconButton
            size="sm"
            label={t.editor.split}
            disabled={busy || text.length < 2}
            onClick={() =>
              editor.split(
                paragraph.id,
                textarea.current?.selectionStart || Math.floor(text.length / 2),
              )
            }
          >
            <Scissors size={15} />
          </IconButton>
          <IconButton
            size="sm"
            label={t.editor.merge}
            disabled={busy || index === 0}
            onClick={() => editor.mergeWithPrevious(paragraph.id)}
          >
            <GitMerge size={15} />
          </IconButton>
          <IconButton
            size="sm"
            tone="danger"
            label={t.editor.remove}
            disabled={busy}
            onClick={() => editor.remove(paragraph.id)}
          >
            <Trash2 size={15} />
          </IconButton>
          <Button
            size="sm"
            disabled={busy || !text.trim() || working}
            onClick={(e) => {
              e.stopPropagation();
              editor.generate([paragraph.id]);
            }}
          >
            <Zap size={14} />
            {take ? t.editor.regenerate : t.editor.generate}
          </Button>
        </div>
      </footer>

      {take && (
        <TakePreview
          peaks={take.peaks}
          duration={take.duration}
          sampleRate={take.sample_rate}
          stale={paragraph.stale}
          {...playback}
          onToggle={() => player.toggleTake(take, playlist)}
          onSeek={(ratio) => {
            if (!playback.isCurrent) player.toggleTake(take, playlist);
            else player.seek(ratio * take.duration);
          }}
          downloadHref={take.url}
          downloadName={`paragraph-${number}.wav`}
          labels={{
            play: t.player.play,
            pause: t.player.pause,
            download: t.editor.downloadWav,
            waveform: t.player.waveform,
          }}
        />
      )}
      {paragraph.stale && <p className="stale-note">{t.editor.stale}</p>}
      {paragraph.error && !working && (
        <p className="error-text" role="status">
          {t.editor.failed} {translateBackend(paragraph.error, t)}
        </p>
      )}
    </article>
  );
}
