"use client";
import { Pause, Play } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { jobService } from "@/services/jobs";
import { Button } from "@/components/atoms";
import { EmptyState, Notice, PageHeading } from "@/components/molecules";
import { JobList } from "@/components/organisms";
import { RequireData } from "@/components/templates/AppShell";

export function QueueView() {
  const { t } = useI18n();
  const { jobs, activeJobs, health, run } = useStudioData();
  const q = t.queue;
  const paused = !!health?.paused;
  return (
    <RequireData>
      <PageHeading
        eyebrow={q.eyebrow}
        title={q.title}
        lead={q.lead}
        actions={
          <Button onClick={() => run(() => jobService.setPaused(!paused))}>
            {paused ? <Play size={17} /> : <Pause size={17} />}
            {paused ? q.resume : q.pause}
          </Button>
        }
      />
      {paused && <Notice tone="info">{q.pausedNotice}</Notice>}
      <div className="panel">
        {jobs.length ? (
          <JobList jobs={jobs} />
        ) : (
          <EmptyState title={q.emptyTitle} description={q.emptyText} />
        )}
      </div>
      <p className="footnote">
        {q.summary(
          jobs.filter((j) => j.status === "completed").length,
          activeJobs.length,
        )}
      </p>
    </RequireData>
  );
}
