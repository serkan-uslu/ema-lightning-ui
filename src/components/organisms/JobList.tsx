"use client";
import Link from "next/link";
import {
  ArrowDownToLine,
  AudioLines,
  Clapperboard,
  RotateCcw,
  X,
} from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { translateBackend } from "@/i18n";
import { formatTime } from "@/lib/format";
import { isRetryableStatus } from "@/lib/project";
import type { Job } from "@/lib/types";
import { downloadFile } from "@/services/http";
import { jobService } from "@/services/jobs";
import { Badge, IconButton, ProgressBar } from "../atoms";

export function JobList({ jobs }: { jobs: Job[] }) {
  const { t, locale } = useI18n();
  const { projects, run } = useStudioData();
  return (
    <ul className="job-list">
      {jobs.map((job) => {
        const project = projects.find((p) => p.id === job.project_id);
        const isRender = job.kind === "render";
        return (
          <li className="job-row" key={job.id}>
            <span className="job-symbol" aria-hidden="true">
              {isRender ? <Clapperboard size={19} /> : <AudioLines size={19} />}
            </span>
            <div className="job-main">
              <Link
                href={
                  isRender
                    ? `/montage/${job.project_id}`
                    : `/projects/${job.project_id}`
                }
              >
                <strong>{job.label}</strong>
              </Link>
              <small>
                {project?.name} · {isRender ? t.queue.render : t.queue.tts} ·{" "}
                {formatTime(job.created_at, locale)}
              </small>
              {job.error && (
                <p className="error-text">{translateBackend(job.error, t)}</p>
              )}
              {isRender && job.status === "running" && (
                <ProgressBar value={job.progress} />
              )}
            </div>
            <Badge
              status={job.status}
              label={t.status[job.status] ?? job.status}
            />
            <div className="row-actions">
              {job.status === "queued" && (
                <IconButton
                  label={t.queue.cancel}
                  onClick={() => run(() => jobService.cancel(job.id))}
                >
                  <X size={17} />
                </IconButton>
              )}
              {isRetryableStatus(job.status) && (
                <IconButton
                  label={t.queue.retry}
                  onClick={() => run(() => jobService.retry(job.id))}
                >
                  <RotateCcw size={17} />
                </IconButton>
              )}
              {job.url && (
                <IconButton
                  label={t.queue.download}
                  onClick={() =>
                    run(() => downloadFile(job.url!, t.montage.mp4Name))
                  }
                >
                  <ArrowDownToLine size={17} />
                </IconButton>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
