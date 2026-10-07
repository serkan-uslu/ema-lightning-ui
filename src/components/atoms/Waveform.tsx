"use client";
import type { KeyboardEvent, MouseEvent } from "react";

type WaveformProps = {
  peaks: number[];
  /** 0–1 share already played; bars before it are highlighted. */
  progress?: number;
  label: string;
  /** Enables click/keyboard seeking with a 0–1 ratio. */
  onSeek?: (ratio: number) => void;
  compact?: boolean;
};

export function Waveform({
  peaks,
  progress = 0,
  label,
  onSeek,
  compact,
}: WaveformProps) {
  const played = Math.round(progress * peaks.length);
  const seekFromPointer = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek?.(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
  };
  const seekFromKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step =
      e.key === "ArrowRight" ? 0.05 : e.key === "ArrowLeft" ? -0.05 : 0;
    if (!step) return;
    e.preventDefault();
    onSeek?.(Math.min(1, Math.max(0, progress + step)));
  };
  return (
    <div
      className={`waveform ${compact ? "waveform-compact" : ""} ${onSeek ? "is-seekable" : ""}`}
      aria-label={label}
      role={onSeek ? "slider" : "img"}
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress * 100) : undefined}
      tabIndex={onSeek ? 0 : undefined}
      onClick={onSeek ? seekFromPointer : undefined}
      onKeyDown={onSeek ? seekFromKey : undefined}
    >
      {peaks.map((peak, i) => (
        <i
          key={i}
          className={i < played ? "played" : undefined}
          style={{ height: `${Math.max(10, peak * 100)}%` }}
        />
      ))}
    </div>
  );
}
