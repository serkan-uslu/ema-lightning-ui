"use client";
import Link from "next/link";
import { ArrowRight, AudioLines, Clapperboard } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { formatClock, formatShortDate } from "@/lib/format";
import { projectStats } from "@/lib/project";
import type { Project } from "@/lib/types";
import { IconLink, ProgressBar } from "../atoms";

export function ProjectTable({ projects }: { projects: Project[] }) {
  const { t, locale } = useI18n();
  const c = t.projects.columns;
  return (
    <div className="project-table" role="table">
      <div className="project-table-head" role="row">
        <span role="columnheader">{c.project}</span>
        <span role="columnheader">{c.paragraphs}</span>
        <span role="columnheader">{c.audio}</span>
        <span role="columnheader">{c.updated}</span>
        <span role="columnheader" />
      </div>
      {projects.map((project, i) => {
        const s = projectStats(project);
        return (
          <div className="project-row" role="row" key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="project-name"
              role="cell"
            >
              <span className={`project-icon tone-${i % 3}`} aria-hidden="true">
                <AudioLines size={20} />
              </span>
              <span>
                <strong>{project.name}</strong>
                <small>{t.projects.readyOf(s.ready, s.total)}</small>
              </span>
            </Link>
            <div className="progress-cell" role="cell">
              <span>
                {s.ready}/{s.total}
              </span>
              <ProgressBar value={s.total ? s.ready / s.total : 0} />
            </div>
            <span className="mono" role="cell">
              {formatClock(s.duration)}
            </span>
            <span className="muted" role="cell">
              {formatShortDate(project.updated_at, locale)}
            </span>
            <span className="row-actions" role="cell">
              <IconLink
                size="sm"
                label={t.projects.openMontage}
                href={`/montage/${project.id}`}
              >
                <Clapperboard size={17} />
              </IconLink>
              <IconLink
                size="sm"
                label={t.projects.open}
                href={`/projects/${project.id}`}
              >
                <ArrowRight size={17} />
              </IconLink>
            </span>
          </div>
        );
      })}
    </div>
  );
}
