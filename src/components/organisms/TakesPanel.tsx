"use client";
import { Check, Pause, Play, History, Trash2 } from "lucide-react";
import { useDeletion } from "@/controls/DeletionProvider";
import {
  useAudioPlayer,
  useTakePlayback,
} from "@/controls/AudioPlayerProvider";
import { useI18n } from "@/controls/I18nProvider";
import type { ProjectEditor } from "@/controls/useProjectEditor";
import { formatClock, formatKhz } from "@/lib/format";
import { SAMPLE_RATES } from "@/lib/project";
import type { Paragraph, Project, SeedMode, Take } from "@/lib/types";
import { IconButton } from "../atoms";
import { Field, Panel } from "../molecules";

export function TakesPanel({
  project,
  editor,
}: {
  project: Project;
  editor: ProjectEditor;
}) {
  const { t } = useI18n();
  const { deleteTake } = useDeletion();
  const paragraph = editor.focused;
  if (!paragraph)
    return (
      <Panel icon={History} title={t.takes.title} className="inspector-panel">
        <p className="hint">{t.takes.pick}</p>
      </Panel>
    );

  const number = project.paragraphs.indexOf(paragraph) + 1;
  const takes = paragraph.takes.slice().reverse();
  return (
    <Panel
      icon={History}
      title={t.takes.titleFor(number)}
      aside={<span className="muted">{t.takes.count(takes.length)}</span>}
      className="inspector-panel"
    >
      <ParagraphOverrides
        paragraph={paragraph}
        project={project}
        editor={editor}
      />
      <ul className="take-list">
        {takes.map((take, i) => (
          <TakeRow
            key={take.id}
            take={take}
            number={takes.length - i}
            chosen={paragraph.selected_take === take.id}
            queue={takes}
            busy={editor.busy}
            onDelete={() => deleteTake(project, take)}
            onChoose={() =>
              editor.updateParagraph(paragraph.id, { selected_take: take.id })
            }
          />
        ))}
      </ul>
      {!takes.length && <p className="hint">{t.takes.none}</p>}
    </Panel>
  );
}

function ParagraphOverrides({
  paragraph,
  project,
  editor,
}: {
  paragraph: Paragraph;
  project: Project;
  editor: ProjectEditor;
}) {
  const { t } = useI18n();
  const mode = paragraph.seed_mode || "inherit";
  return (
    <div className="override-grid">
      <Field label={t.takes.sampleRate}>
        <select
          value={paragraph.sample_rate ?? "inherit"}
          onChange={(e) =>
            editor.updateParagraph(paragraph.id, {
              sample_rate:
                e.target.value === "inherit" ? null : Number(e.target.value),
            })
          }
        >
          <option value="inherit">
            {t.takes.inheritRate(formatKhz(project.sample_rate))}
          </option>
          {SAMPLE_RATES.map((rate) => (
            <option value={rate} key={rate}>
              {formatKhz(rate)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.takes.seedMode}>
        <select
          value={mode}
          onChange={(e) => {
            const seed_mode = e.target.value as SeedMode;
            editor.updateParagraph(paragraph.id, {
              seed_mode,
              seed: seed_mode === "fixed" ? (paragraph.seed ?? 0) : null,
            });
          }}
        >
          {(Object.keys(t.takes.seedModes) as SeedMode[]).map((m) => (
            <option key={m} value={m}>
              {t.takes.seedModes[m]}
            </option>
          ))}
        </select>
      </Field>
      {mode === "fixed" && (
        <Field label={t.takes.seed}>
          <input
            key={`${paragraph.id}-${paragraph.seed}`}
            type="number"
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            defaultValue={paragraph.seed ?? 0}
            onBlur={(e) =>
              editor.updateParagraph(paragraph.id, {
                seed: Number(e.target.value),
              })
            }
          />
        </Field>
      )}
    </div>
  );
}

function TakeRow({
  take,
  number,
  chosen,
  queue,
  onChoose,
  onDelete,
  busy,
}: {
  take: Take;
  number: number;
  chosen: boolean;
  queue: Take[];
  onChoose: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const player = useAudioPlayer();
  const playback = useTakePlayback(take.id);
  return (
    <li
      className={`take-choice ${chosen ? "is-chosen" : ""} ${playback.isCurrent ? "is-current" : ""}`}
    >
      <div>
        <strong>
          {t.takes.take(number)}
          {chosen && <span className="chosen-tag">{t.takes.chosen}</span>}
        </strong>
        <span>{t.takes.meta(formatClock(take.duration), take.seed)}</span>
        <small>
          {t.takes.generation(
            take.settings.speed,
            take.generation_seconds.toFixed(2),
          )}
        </small>
      </div>
      <IconButton
        label={playback.playing ? t.player.pause : t.player.play}
        active={playback.isCurrent}
        onClick={() => player.toggleTake(take, queue)}
      >
        {playback.playing ? <Pause size={14} /> : <Play size={14} />}
      </IconButton>
      <IconButton
        label={chosen ? t.takes.chosen : t.takes.choose}
        tone={chosen ? "accent" : "default"}
        disabled={chosen || busy}
        onClick={onChoose}
      >
        <Check size={16} />
      </IconButton>
      <IconButton
        size="sm"
        tone="danger"
        label={`${t.deletion.deleteTake} · ${t.takes.take(number)}`}
        disabled={busy}
        onClick={onDelete}
      >
        <Trash2 size={15} />
      </IconButton>
    </li>
  );
}
