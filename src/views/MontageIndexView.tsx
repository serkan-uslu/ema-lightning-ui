"use client";
import Link from "next/link";
import { ArrowRight, Clapperboard, Plus } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { formatClock } from "@/lib/format";
import { projectStats, selectedTakes } from "@/lib/project";
import { Badge, Button } from "@/components/atoms";
import { EmptyState, PageHeading, StepList } from "@/components/molecules";
import { RequireData } from "@/components/templates/AppShell";

/** Entry point of the montage studio: pick which project to edit. */
export function MontageIndexView() {
  const { t } = useI18n();
  const { projects } = useStudioData();
  const { openNewProject } = useShell();
  const mi = t.montageIndex;
  return (
    <RequireData>
      <PageHeading eyebrow={mi.eyebrow} title={mi.title} lead={mi.lead} />
      <StepList steps={mi.steps} />
      {projects.length ? (
        <div className="montage-cards">
          {projects.map((project) => {
            const s = projectStats(project);
            const takes = selectedTakes(project).length;
            return (
              <Link
                key={project.id}
                href={`/montage/${project.id}`}
                className="montage-card"
              >
                <span className="montage-card-icon" aria-hidden="true">
                  <Clapperboard size={22} />
                </span>
                <div className="montage-card-body">
                  <strong>{project.name}</strong>
                  <small>
                    {s.clips
                      ? `${mi.clips(s.clips)} · ${formatClock(s.timelineEnd)}`
                      : mi.noClips}{" "}
                    · {mi.readyAudio(takes)} · {project.timeline.aspect}
                  </small>
                </div>
                {s.lastRender && (
                  <span className="montage-card-render">
                    <small>{mi.lastRender}</small>
                    <Badge
                      status={s.lastRender.status}
                      label={
                        t.status[s.lastRender.status] ?? s.lastRender.status
                      }
                    />
                  </span>
                )}
                <ArrowRight size={18} className="muted" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <EmptyState
            icon={Clapperboard}
            title={mi.emptyTitle}
            description={mi.emptyText}
            action={
              <Button variant="primary" onClick={openNewProject}>
                <Plus size={17} />
                {t.projects.create}
              </Button>
            }
          />
        </div>
      )}
    </RequireData>
  );
}
