"use client";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FileAudio,
  Folder,
  Headphones,
  Plus,
} from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { formatClock } from "@/lib/format";
import { projectStats } from "@/lib/project";
import { Button } from "@/components/atoms";
import {
  EmptyState,
  PageHeading,
  SectionHeading,
  StatCard,
  StepList,
} from "@/components/molecules";
import { DashboardHero, ProjectTable } from "@/components/organisms";
import { RequireData } from "@/components/templates/AppShell";

export function DashboardView() {
  const { t } = useI18n();
  const { openNewProject } = useShell();
  const { projects, activeJobs, health } = useStudioData();
  const d = t.dashboard;
  const stats = projects.map(projectStats);
  const paragraphs = stats.reduce((n, s) => n + s.total, 0);
  const ready = stats.reduce((n, s) => n + s.ready, 0);
  const audio = stats.reduce((n, s) => n + s.duration, 0);

  return (
    <RequireData>
      <PageHeading eyebrow={d.eyebrow} title={d.title} lead={d.lead} />
      <DashboardHero onStart={openNewProject} />
      <div className="stats">
        <StatCard
          label={d.stats.projects}
          value={String(projects.length)}
          caption={d.stats.projectsCaption}
          icon={Folder}
        />
        <StatCard
          label={d.stats.ready}
          value={String(ready)}
          caption={d.stats.readyCaption(paragraphs)}
          icon={FileAudio}
        />
        <StatCard
          label={d.stats.audio}
          value={formatClock(audio)}
          caption={d.stats.audioCaption}
          icon={Headphones}
        />
        <StatCard
          label={d.stats.jobs}
          value={String(activeJobs.length)}
          caption={health?.paused ? d.stats.paused : d.stats.jobsCaption}
          icon={Activity}
        />
      </div>
      <SectionHeading
        title={d.recent}
        count={projects.length}
        lead={d.recentLead}
        action={
          <Link className="text-link" href="/projects">
            {d.seeAll} <ArrowRight size={15} />
          </Link>
        }
      />
      <div className="panel">
        {projects.length ? (
          <ProjectTable projects={projects.slice(0, 5)} />
        ) : (
          <EmptyState
            title={t.projects.emptyTitle}
            description={t.projects.emptyText}
            action={
              <Button variant="primary" onClick={openNewProject}>
                <Plus size={17} />
                {t.projects.create}
              </Button>
            }
          />
        )}
      </div>
      <StepList steps={d.steps} />
    </RequireData>
  );
}
