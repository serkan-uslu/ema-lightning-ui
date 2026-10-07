"use client";
import { useRouter } from "next/navigation";
import { Clapperboard, Save } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useProject, useStudioData } from "@/controls/StudioDataProvider";
import { useMontageEditor } from "@/controls/useMontageEditor";
import type { Project } from "@/lib/types";
import { Button, ButtonLink } from "@/components/atoms";
import { EmptyState, PageHeading, ProjectTabs } from "@/components/molecules";
import {
  ClipInspector,
  MediaLibrary,
  MontagePreview,
  RenderPanel,
  TimelineEditor,
} from "@/components/organisms";
import { RequireData } from "@/components/templates/AppShell";

export function MontageView({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const project = useProject(projectId);
  return (
    <RequireData>
      {project ? (
        <Montage key={project.id} project={project} />
      ) : (
        <EmptyState
          icon={Clapperboard}
          title={t.montage.pickTitle}
          description={t.montage.pickText}
          action={<ButtonLink href="/montage">{t.nav.montage}</ButtonLink>}
        />
      )}
    </RequireData>
  );
}

function Montage({ project }: { project: Project }) {
  const { t } = useI18n();
  const router = useRouter();
  const { projects } = useStudioData();
  const { playerRef, ...editor } = useMontageEditor(project);
  const m = t.montage;

  return (
    <>
      <ProjectTabs
        projectId={project.id}
        active="montage"
        labels={t.projectTabs}
        clipCount={editor.clips.length}
      />
      <PageHeading
        eyebrow={m.eyebrow}
        title={project.name}
        lead={m.lead}
        actions={
          <>
            {projects.length > 1 && (
              <select
                className="project-switch"
                aria-label={m.switchProject}
                value={project.id}
                onChange={(e) => {
                  if (!editor.dirty || window.confirm(m.leaveWarning))
                    router.push(`/montage/${e.target.value}`);
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <Button
              disabled={editor.busy || !editor.dirty}
              onClick={editor.save}
            >
              <Save size={16} />
              {editor.dirty ? m.save : m.saved}
            </Button>
            <Button
              variant="primary"
              disabled={editor.busy || !editor.clips.length}
              onClick={editor.render}
            >
              <Clapperboard size={16} />
              {m.render}
            </Button>
          </>
        }
      />
      <div className="montage-grid">
        <MediaLibrary project={project} editor={editor} />
        <MontagePreview editor={editor} playerRef={playerRef} />
        <aside className="inspector montage-inspector">
          <ClipInspector editor={editor} />
          <RenderPanel editor={editor} />
        </aside>
        <TimelineEditor editor={editor} />
      </div>
    </>
  );
}
