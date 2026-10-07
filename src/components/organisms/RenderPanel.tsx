"use client";
import { Clapperboard, Download, RotateCcw } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import type { MontageEditor } from "@/controls/useMontageEditor";
import { translateBackend } from "@/i18n";
import { formatTime } from "@/lib/format";
import { isRetryableStatus } from "@/lib/project";
import { downloadFile } from "@/services/http";
import { jobService } from "@/services/jobs";
import { Badge, Button, ProgressBar } from "../atoms";
import { Panel } from "../molecules";

export function RenderPanel({ editor }: { editor: MontageEditor }) {
  const { t, locale } = useI18n();
  const { run } = useStudioData();
  const m = t.montage;
  return (
    <Panel icon={Clapperboard} title={m.renders} className="inspector-panel">
      {editor.renderJobs.length ? (
        <ul className="render-list">
          {editor.renderJobs.map((job) => (
            <li className="render-result" key={job.id}>
              <div>
                <Badge
                  status={job.status}
                  label={t.status[job.status] ?? job.status}
                />
                <span className="muted">
                  {formatTime(job.created_at, locale)}
                </span>
              </div>
              {job.status === "running" && (
                <div className="render-progress">
                  <ProgressBar value={job.progress} />
                  <small className="mono">
                    {Math.round(job.progress * 100)}%
                  </small>
                </div>
              )}
              {job.url && (
                <Button
                  block
                  size="sm"
                  onClick={() => run(() => downloadFile(job.url!, m.mp4Name))}
                >
                  <Download size={15} />
                  {m.downloadMp4}
                </Button>
              )}
              {job.error && (
                <p className="error-text">{translateBackend(job.error, t)}</p>
              )}
              {isRetryableStatus(job.status) && (
                <Button
                  size="sm"
                  onClick={() => run(() => jobService.retry(job.id))}
                >
                  <RotateCcw size={15} />
                  {t.queue.retry}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">{m.noRenders}</p>
      )}
      <p className="hint">{m.snapshotHint}</p>
    </Panel>
  );
}
