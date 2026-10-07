"use client";
import { ArrowRight, AudioLines, Check } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { Button } from "../atoms";

// Deterministic bar heights for the decorative sound sculpture.
const BARS = Array.from(
  { length: 53 },
  (_, i) => 24 + Math.pow(Math.sin(i * 0.19), 2) * 132 + Math.sin(i * 0.7) * 22,
);

export function DashboardHero({
  onStart,
  disabled,
}: {
  onStart: () => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const d = t.dashboard;
  return (
    <section className="hero">
      <div className="hero-copy">
        <span className="hero-tag">
          <span aria-hidden="true" />
          {d.heroTag}
        </span>
        <h2>
          {d.heroTitle}
          <br />
          <em>{d.heroAccent}</em>
        </h2>
        <p>{d.heroText}</p>
        <Button variant="primary" onClick={onStart} disabled={disabled}>
          {d.start} <ArrowRight size={17} />
        </Button>
        <div className="hero-meta">
          <span>
            <Check size={13} aria-hidden="true" />
            {d.local}
          </span>
          <span>
            <Check size={13} aria-hidden="true" />
            {d.noKey}
          </span>
        </div>
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="orb one" />
        <div className="orb two" />
        <div className="sound-sculpture">
          {BARS.map((height, i) => (
            <i key={i} style={{ height: `${height}px` }} />
          ))}
        </div>
        <div className="art-card">
          <span className="art-icon">
            <AudioLines size={21} />
          </span>
          <div>
            <strong>{d.artTitle}</strong>
            <small>EMA Lightning · 48 kHz</small>
          </div>
        </div>
      </div>
    </section>
  );
}
