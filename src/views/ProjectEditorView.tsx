"use client";
import { useState } from "react";
import { Headphones, Plus, RotateCcw, Save, Upload, Zap } from "lucide-react";
import { useAudioPlayer } from "@/controls/AudioPlayerProvider";
import { useDrafts } from "@/controls/DraftsProvider";
import { useI18n } from "@/controls/I18nProvider";
import { useProject } from "@/controls/StudioDataProvider";
import { useProjectEditor } from "@/controls/useProjectEditor";
import { formatClock } from "@/lib/format";
import { selectedTakes } from "@/lib/project";
import type { Project } from "@/lib/types";
import { Button, ButtonLink, Checkbox, IconButton } from "@/components/atoms";
import {
  EmptyState,
  FileButton,
  PageHeading,
  ProjectTabs,
} from "@/components/molecules";
import {
  ExportPanel,
  ParagraphCard,
  ProjectSettingsPanel,
  TakesPanel,
} from "@/components/organisms";
import { RequireData } from "@/components/templates/AppShell";

export function ProjectEditorView({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const project = useProject(projectId);
  return (
    <RequireData>
      {project ? (
        <Editor key={project.id} project={project} />
      ) : (
        <EmptyState
          title={t.projects.notFound}
          description={t.projects.notFoundText}
          action={
            <ButtonLink href="/projects">{t.projects.openProjects}</ButtonLink>
          }
        />
      )}
    </RequireData>
  );
}

function Editor({ project }: { project: Project }) {
  const { t } = useI18n();
  const editor = useProjectEditor(project);
  const player = useAudioPlayer();
  const [name, setName] = useState<string | null>(null);
  const playlist = selectedTakes(project);
  const montageDraft = useDrafts().montage[project.id];
  const e = t.editor;

  return (
    <>
      <ProjectTabs
        projectId={project.id}
        active="audio"
        labels={t.projectTabs}
        clipCount={(montageDraft ?? project.timeline).clips.length}
        unsaved={montageDraft ? t.montage.unsaved : undefined}
      />
      <PageHeading
        eyebrow={e.eyebrow}
        lead={e.summary(
          project.paragraphs.length,
          formatClock(editor.totalDuration),
        )}
        actions={
          <Button
            variant="primary"
            disabled={editor.busy || !project.paragraphs.length}
            onClick={() => editor.generate()}
          >
            <Zap size={17} />
            {e.generateAll}
          </Button>
        }
      >
        <input
          aria-label={e.rename}
          className="title-input"
          value={name ?? project.name}
          onChange={(ev) => setName(ev.target.value)}
          onBlur={() => {
            if (name !== null) editor.rename(name).then(() => setName(null));
          }}
          onKeyDown={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
        />
      </PageHeading>

      <div className="studio-grid">
        <section className="paragraph-workspace" aria-label={e.paragraphs}>
          <div className="editor-toolbar">
            <div>
              <Checkbox
                label={e.selectAll}
                checked={editor.allChecked}
                indeterminate={editor.checked.length > 0 && !editor.allChecked}
                onChange={editor.toggleAll}
              />
              <span>
                {editor.checked.length
                  ? e.selected(editor.checked.length)
                  : e.paragraphs}
              </span>
            </div>
            <div>
              <Button
                size="sm"
                disabled={editor.busy || !editor.checked.length}
                onClick={() => editor.generate(editor.checked)}
              >
                <Zap size={14} />
                {e.generateSelected}
              </Button>
              <IconButton
                label={e.generateMissing}
                disabled={editor.busy}
                onClick={() => editor.generate(undefined, true)}
              >
                <RotateCcw size={16} />
              </IconButton>
              <IconButton
                label={e.saveTexts}
                disabled={editor.busy}
                onClick={editor.saveTexts}
              >
                <Save size={16} />
              </IconButton>
            </div>
          </div>

          {!project.paragraphs.length && (
            <EmptyState title={e.emptyTitle} description={e.emptyText} />
          )}
          <div className="paragraph-list">
            {project.paragraphs.map((paragraph, index) => (
              <ParagraphCard
                key={paragraph.id}
                paragraph={paragraph}
                index={index}
                count={project.paragraphs.length}
                projectSpeed={project.speed}
                editor={editor}
                playlist={playlist}
              />
            ))}
          </div>

          <div className="append-toolbar">
            <Button disabled={editor.busy} onClick={editor.addParagraph}>
              <Plus size={16} />
              {e.addParagraph}
            </Button>
            <FileButton
              accept=".txt,text/plain"
              onFile={editor.importText}
              disabled={editor.busy}
            >
              <Upload size={15} />
              {e.importTxt}
            </FileButton>
            <Button
              disabled={!playlist.length}
              onClick={() => player.playQueue(playlist)}
            >
              <Headphones size={16} />
              {e.playAll}
            </Button>
          </div>
        </section>

        <aside className="inspector">
          <TakesPanel project={project} editor={editor} />
          <ProjectSettingsPanel project={project} editor={editor} />
          <ExportPanel project={project} editor={editor} />
        </aside>
      </div>
    </>
  );
}
