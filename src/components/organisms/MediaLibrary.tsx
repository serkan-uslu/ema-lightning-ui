"use client";
import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Layers,
  ListPlus,
  Pause,
  Play,
  Plus,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import {
  useAudioPlayer,
  useTakePlayback,
} from "@/controls/AudioPlayerProvider";
import { useI18n } from "@/controls/I18nProvider";
import { useDeletion } from "@/controls/DeletionProvider";
import type { MontageEditor } from "@/controls/useMontageEditor";
import { formatClock, formatKhz } from "@/lib/format";
import type { Project, Take } from "@/lib/types";
import { Button, ButtonLink, IconButton } from "../atoms";
import { FileButton, Panel, Segmented } from "../molecules";

export function MediaLibrary({
  project,
  editor,
}: {
  project: Project;
  editor: MontageEditor;
}) {
  const { t } = useI18n();
  const { deleteTake } = useDeletion();
  const m = t.montage;
  const [tab, setTab] = useState<"audio" | "media">("audio");
  const orphanTakes = project.all_takes.filter(
    (take) =>
      !project.paragraphs.some(
        (paragraph) => paragraph.id === take.paragraph_id,
      ),
  );
  return (
    <Panel icon={Layers} title={m.library} className="media-library">
      <Segmented
        label={m.library}
        value={tab}
        onChange={setTab}
        options={[
          { value: "audio", label: `${m.audioTab} · ${editor.takes.length}` },
          { value: "media", label: `${m.mediaTab} · ${project.assets.length}` },
        ]}
      />
      {tab === "audio" ? (
        <>
          {editor.takes.length > 0 ? (
            <>
              <Button
                block
                size="sm"
                onClick={() => editor.append(editor.takes)}
              >
                <ListPlus size={15} />
                {m.addSelected}
              </Button>
              <ul className="library-list">
                {editor.takes.map((take) => (
                  <AudioItem
                    key={take.id}
                    take={take}
                    number={
                      project.paragraphs.findIndex(
                        (p) => p.id === take.paragraph_id,
                      ) + 1
                    }
                    queue={editor.takes}
                    onAdd={() => editor.append([take])}
                    onDelete={() => deleteTake(project, take)}
                    busy={editor.busy}
                  />
                ))}
              </ul>
            </>
          ) : (
            <div className="library-empty">
              <p className="hint">{m.noAudio}</p>
              <ButtonLink size="sm" href={`/projects/${project.id}`}>
                {m.goToAudio} <ArrowRight size={15} />
              </ButtonLink>
            </div>
          )}
          {orphanTakes.length > 0 && (
            <details className="library-archive">
              <summary>{t.deletion.orphanTakes(orphanTakes.length)}</summary>
              <p className="hint">{t.deletion.orphanHint}</p>
              <ul className="library-list">
                {orphanTakes.map((take) => (
                  <AudioItem
                    key={take.id}
                    take={take}
                    number={0}
                    queue={orphanTakes}
                    onAdd={() => editor.append([take])}
                    onDelete={() => deleteTake(project, take)}
                    busy={editor.busy}
                  />
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <>
          <FileButton
            variant="dropzone"
            accept=".png,.jpg,.jpeg,.mp4"
            onFile={editor.upload}
            disabled={editor.busy}
          >
            <Upload size={22} aria-hidden="true" />
            <strong>{m.upload}</strong>
            <span>{m.uploadHint}</span>
          </FileButton>
          <ul className="library-list">
            {project.assets.map((asset) => (
              <li className="library-item" key={asset.id}>
                <span className="media-thumb" aria-hidden="true">
                  {asset.kind === "image" ? (
                    // Local API media; next/image optimisation is not useful here.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.url} alt="" />
                  ) : (
                    <Video size={20} />
                  )}
                </span>
                <div>
                  <strong title={asset.name}>{asset.name}</strong>
                  <small>
                    {asset.width} × {asset.height}
                  </small>
                  <span>
                    {asset.kind === "video"
                      ? formatClock(asset.duration)
                      : m.image}
                  </span>
                </div>
                <IconButton
                  label={m.addToTimeline}
                  onClick={() => editor.append([asset])}
                >
                  <Plus size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
          {!project.assets.length && <p className="hint">{m.noMedia}</p>}
        </>
      )}
    </Panel>
  );
}

function AudioItem({
  take,
  number,
  queue,
  onAdd,
  onDelete,
  busy,
}: {
  take: Take;
  number: number;
  queue: Take[];
  onAdd: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { t } = useI18n();
  const player = useAudioPlayer();
  const playback = useTakePlayback(take.id);
  return (
    <li className={`library-item ${playback.isCurrent ? "is-current" : ""}`}>
      <button
        type="button"
        className="media-thumb audio-thumb"
        aria-label={playback.playing ? t.player.pause : t.player.play}
        title={playback.playing ? t.player.pause : t.player.play}
        onClick={() => player.toggleTake(take, queue)}
      >
        {playback.playing ? (
          <Pause size={18} />
        ) : playback.isCurrent ? (
          <Play size={18} />
        ) : (
          <AudioLines size={20} />
        )}
      </button>
      <div>
        <strong>
          {number > 0
            ? t.montage.paragraph(number)
            : t.montage.removedParagraph}
        </strong>
        <small title={take.text}>{take.text}</small>
        <span>
          {formatClock(take.duration)} · {formatKhz(take.sample_rate)}
        </span>
      </div>
      <IconButton
        label={t.montage.addToTimeline}
        onClick={onAdd}
        disabled={busy}
      >
        <Plus size={16} />
      </IconButton>
      <IconButton
        size="sm"
        tone="danger"
        label={t.deletion.deleteTake}
        onClick={onDelete}
        disabled={busy}
      >
        <Trash2 size={15} />
      </IconButton>
    </li>
  );
}
