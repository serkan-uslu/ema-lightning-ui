"use client";
import Link from "next/link";
import {
  Download,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  useAudioPlayer,
  usePlaybackClock,
} from "@/controls/AudioPlayerProvider";
import { useI18n } from "@/controls/I18nProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { formatClock, formatKhz } from "@/lib/format";
import { IconAnchor, IconButton, Waveform } from "../atoms";

/** Bottom transport for the shared audio player. */
export function PlayerBar() {
  const { t } = useI18n();
  const player = useAudioPlayer();
  const { time, duration } = usePlaybackClock();
  const { projects } = useStudioData();
  const take = player.current;
  if (!take) return null;

  const project = projects.find((p) =>
    p.paragraphs.some((x) => x.id === take.paragraph_id),
  );
  const paragraphIndex =
    project?.paragraphs.findIndex((x) => x.id === take.paragraph_id) ?? -1;
  const length = duration || take.duration;
  const progress = length ? Math.min(1, time / length) : 0;

  return (
    <section className="player-bar" aria-label={t.player.label}>
      <div className="player-info">
        <span
          className={`player-art ${player.playing ? "is-playing" : ""}`}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
        </span>
        <div>
          <strong title={take.text}>{take.text}</strong>
          <small>
            {project ? (
              <Link href={`/projects/${project.id}`}>
                {project.name}
                {paragraphIndex >= 0 &&
                  ` · ${t.player.paragraph(paragraphIndex + 1)}`}
              </Link>
            ) : (
              t.engine.name
            )}
            {" · "}
            {formatKhz(take.sample_rate)}
            {player.queue.length > 1 &&
              ` · ${t.player.track(player.index + 1, player.queue.length)}`}
          </small>
        </div>
      </div>

      <div className="player-transport">
        <IconButton
          size="sm"
          label={t.player.previous}
          onClick={player.previous}
        >
          <SkipBack size={16} />
        </IconButton>
        <button
          type="button"
          className="play-round play-round-lg"
          onClick={player.toggle}
          aria-label={player.playing ? t.player.pause : t.player.play}
          title={player.playing ? t.player.pause : t.player.play}
        >
          {player.playing ? (
            <Pause size={18} fill="currentColor" />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </button>
        <IconButton
          size="sm"
          label={t.player.next}
          onClick={player.next}
          disabled={player.index >= player.queue.length - 1}
        >
          <SkipForward size={16} />
        </IconButton>
      </div>

      <div className="player-timeline">
        <span className="mono">{formatClock(time)}</span>
        <Waveform
          peaks={take.peaks}
          progress={progress}
          label={t.player.seek}
          onSeek={(ratio) => player.seek(ratio * length)}
        />
        <span className="mono">{formatClock(length)}</span>
      </div>

      <div className="player-extra">
        <IconButton
          size="sm"
          label={t.player.volume}
          onClick={() => player.setVolume(player.volume > 0 ? 0 : 1)}
        >
          {player.volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </IconButton>
        <input
          className="volume-range"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={player.volume}
          aria-label={t.player.volume}
          onChange={(e) => player.setVolume(Number(e.target.value))}
        />
        <IconAnchor
          size="sm"
          label={t.player.download}
          href={take.url}
          download="ema-take.wav"
        >
          <Download size={16} />
        </IconAnchor>
        <IconButton size="sm" label={t.player.close} onClick={player.close}>
          <X size={16} />
        </IconButton>
      </div>
    </section>
  );
}
