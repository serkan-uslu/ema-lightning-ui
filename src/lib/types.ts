// Shapes returned by the local FastAPI service (backend/app.py).

export type Settings = {
  speed: number;
  seed: number | null;
  sample_rate: number;
};

export type Take = {
  id: string;
  paragraph_id: string;
  text: string;
  settings: Settings;
  seed: number;
  duration: number;
  sample_rate: number;
  fingerprint: string;
  created_at: string;
  generation_seconds: number;
  url: string;
  peaks: number[];
};

export type SeedMode = "inherit" | "random" | "fixed";

export type ParagraphStatus =
  | "empty"
  | "ready"
  | "stale"
  | "queued"
  | "running"
  | "failed"
  | "interrupted"
  | "cancelled";

export type Paragraph = {
  id: string;
  text: string;
  speed: number | null;
  seed: number | null;
  sample_rate: number | null;
  seed_mode?: SeedMode;
  selected_take: string | null;
  takes: Take[];
  stale: boolean;
  status: ParagraphStatus | string;
};

export type Asset = {
  id: string;
  kind: "image" | "video";
  name: string;
  duration: number;
  width: number;
  height: number;
  url: string;
  size: number;
};

export type ClipKind = "audio" | "image" | "video";
export type ClipFit = "cover" | "contain";

export type Clip = {
  id: string;
  source_id: string;
  kind: ClipKind;
  label: string;
  start: number;
  trim: number;
  duration: number;
  volume: number;
  fit: ClipFit;
  src?: string;
};

export type Aspect = "16:9" | "9:16";
export type Timeline = { aspect: Aspect; clips: Clip[] };

export type JobStatus =
  "queued" | "running" | "completed" | "failed" | "interrupted" | "cancelled";

export type Job = {
  id: string;
  project_id: string;
  kind: "tts" | "render";
  status: JobStatus | string;
  created_at: string;
  progress: number;
  error: string | null;
  label: string;
  paragraph_id?: string;
  url?: string;
};

export type Project = Settings & {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  paragraphs: Paragraph[];
  assets: Asset[];
  all_takes: Take[];
  jobs: Job[];
  timeline: Timeline;
};

export type Health = {
  model: {
    status: "loading" | "ready" | "error" | string;
    device: string;
    error: string | null;
  };
  paused: boolean;
  data_path: string;
  version: string;
  render_available: boolean;
};
