"use client";
import { Plus } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { Button } from "@/components/atoms";
import {
  EmptyState,
  PageHeading,
  SectionHeading,
} from "@/components/molecules";
import { ProjectTable } from "@/components/organisms";
import { RequireData } from "@/components/templates/AppShell";

export function ProjectsView() {
  const { t } = useI18n();
  const { openNewProject } = useShell();
  const { projects } = useStudioData();
  const create = (
    <Button variant="primary" onClick={openNewProject}>
      <Plus size={18} />
      {t.projects.create}
    </Button>
  );
  return (
    <RequireData>
      <PageHeading
        eyebrow={t.dashboard.eyebrow}
        title={t.projects.title}
        lead={t.projects.lead}
        actions={create}
      />
      <SectionHeading title={t.projects.all} count={projects.length} />
      <div className="panel">
        {projects.length ? (
          <ProjectTable projects={projects} />
        ) : (
          <EmptyState
            title={t.projects.emptyTitle}
            description={t.projects.emptyText}
            action={create}
          />
        )}
      </div>
    </RequireData>
  );
}
