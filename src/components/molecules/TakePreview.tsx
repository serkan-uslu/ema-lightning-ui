import { Download, Pause, Play } from "lucide-react";
import { formatClock, formatKhz } from "@/lib/format";
import { IconAnchor, Waveform } from "../atoms";

export type TakePreviewProps = {
  peaks: number[];
  duration: number;
  sampleRate: number;
  playing: boolean;
  isCurrent: boolean;
  progress: number;
  stale?: boolean;
  onToggle: () => void;
  onSeek: (ratio: number) => void;
  downloadHref: string;
  downloadName: string;
  labels: { play: string; pause: string; download: string; waveform: string };
};

export function TakePreview(props: TakePreviewProps) {
  const { playing, isCurrent, progress, duration, labels } = props;
  return (
    <div
      className={`take-preview ${isCurrent ? "is-current" : ""} ${props.stale ? "is-stale" : ""}`}
    >
      <button
        type="button"
        className="play-round"
        aria-label={playing ? labels.pause : labels.play}
        title={playing ? labels.pause : labels.play}
        onClick={props.onToggle}
      >
        {playing ? (
          <Pause size={15} fill="currentColor" />
        ) : (
          <Play size={15} fill="currentColor" />
        )}
      </button>
      <Waveform
        peaks={props.peaks}
        progress={isCurrent ? progress : 0}
        label={labels.waveform}
        onSeek={props.onSeek}
      />
      <span className="mono take-time">
        {isCurrent ? `${formatClock(progress * duration)} / ` : ""}
        {formatClock(duration)}
      </span>
      <span className="muted take-rate">{formatKhz(props.sampleRate)}</span>
      <IconAnchor
        size="sm"
        label={labels.download}
        href={props.downloadHref}
        download={props.downloadName}
      >
        <Download size={16} />
      </IconAnchor>
    </div>
  );
}
