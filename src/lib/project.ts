import type { Job, Paragraph, Project, Take } from "./types";

export const SAMPLE_RATES = [48000, 24000, 16000, 8000] as const;
export const SPEED_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const;
export const SPEED_RANGE = { min: 0.25, max: 4, step: 0.05 } as const;
export const MAX_TEXT_FILE_BYTES = 800_000;
export const FPS = 30;

const ACTIVE = ["queued", "running"];
const RETRYABLE = ["failed", "interrupted", "cancelled"];

export const isActiveStatus = (status: string) => ACTIVE.includes(status);
export const isRetryableStatus = (status: string) => RETRYABLE.includes(status);
export const isActiveJob = (job: Job) => isActiveStatus(job.status);

export const selectedTake = (paragraph: Paragraph): Take | undefined =>
  paragraph.takes.find((take) => take.id === paragraph.selected_take);

export const selectedTakes = (project: Project): Take[] =>
  project.paragraphs.map(selectedTake).filter((t): t is Take => !!t);

export function projectStats(project: Project) {
  const ready = project.paragraphs.filter((p) => p.status === "ready").length;
  const failed = project.paragraphs.filter((p) =>
    ["failed", "interrupted"].includes(p.status),
  ).length;
  const duration = project.paragraphs.reduce(
    (sum, p) => sum + (selectedTake(p)?.duration || 0),
    0,
  );
  const timelineEnd = Math.max(
    0,
    ...project.timeline.clips.map((c) => c.start + c.duration),
  );
  const renders = project.jobs.filter((j) => j.kind === "render");
  return {
    ready,
    failed,
    total: project.paragraphs.length,
    duration,
    clips: project.timeline.clips.length,
    timelineEnd,
    lastRender: renders[0],
  };
}

/** Splits pasted or imported text into paragraphs on blank lines. */
export const splitParagraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

export class TextFileError extends Error {
  constructor(public reason: "too-large" | "encoding") {
    super(reason);
  }
}

export async function readUtf8TextFile(file: File) {
  if (file.size > MAX_TEXT_FILE_BYTES) throw new TextFileError("too-large");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer(),
    );
  } catch {
    throw new TextFileError("encoding");
  }
}
