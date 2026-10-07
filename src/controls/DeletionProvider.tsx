"use client";
import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ButtonLink } from "@/components/atoms";
import { ConfirmationModal } from "@/components/molecules";
import { describeError } from "@/i18n";
import { formatClock } from "@/lib/format";
import type { Paragraph, Project, Take } from "@/lib/types";
import { paragraphService } from "@/services/paragraphs";
import { projectService } from "@/services/projects";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useDrafts } from "./DraftsProvider";
import { useI18n } from "./I18nProvider";
import { useStudioData } from "./StudioDataProvider";

type DeletionTarget =
  | { kind: "project"; project: Project }
  | { kind: "take"; project: Project; take: Take }
  | {
      kind: "paragraph";
      project: Project;
      paragraph: Paragraph;
      text: string;
      onDeleted: () => void;
    };

type DeletionControls = {
  deleteProject: (project: Project) => void;
  deleteTake: (project: Project, take: Take) => void;
  deleteParagraph: (
    project: Project,
    paragraph: Paragraph,
    text: string,
    onDeleted: () => void,
  ) => void;
};

const DeletionContext = createContext<DeletionControls | null>(null);

/** One confirmation workflow for project, WAV and paragraph deletion. */
export function DeletionProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const data = useStudioData();
  const player = useAudioPlayer();
  const drafts = useDrafts();
  const pathname = usePathname();
  const router = useRouter();
  const [target, setTarget] = useState<DeletionTarget | null>(null);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState("");
  const d = t.deletion;

  const requestDeletion = (next: DeletionTarget) => {
    if (pendingRef.current || data.busy) return;
    setReturnFocus(
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
    );
    setError("");
    setTarget(next);
  };
  const cancel = () => {
    if (pendingRef.current) return;
    setTarget(null);
    setError("");
  };

  const project = target
    ? (data.projects.find((item) => item.id === target.project.id) ??
      target.project)
    : null;
  const hasActiveJobs =
    !!project && data.activeJobs.some((job) => job.project_id === project.id);
  const takeInMontage =
    target?.kind === "take" &&
    !!project &&
    [project.timeline, drafts.montage[project.id]].some((timeline) =>
      timeline?.clips.some(
        (clip) => clip.kind === "audio" && clip.source_id === target.take.id,
      ),
    );
  const blockedReason =
    target?.kind !== "paragraph" && hasActiveJobs
      ? d.activeJobs
      : takeInMontage
        ? d.takeInMontage
        : "";

  const clearTextDrafts = (ids: string[]) =>
    drafts.updateTexts((current) => {
      const next = { ...current };
      for (const id of ids) delete next[id];
      return next;
    });

  const confirm = async () => {
    if (!target || !project || pendingRef.current || blockedReason) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    const success = await data.run(async () => {
      try {
        if (target.kind === "project") {
          await projectService.remove(project.id);
          clearTextDrafts(project.paragraphs.map((paragraph) => paragraph.id));
          drafts.setMontage(project.id, null);
          player.removeTakes(project.all_takes.map((take) => take.id));
          if (
            pathname === `/projects/${project.id}` ||
            pathname === `/montage/${project.id}`
          )
            router.replace("/projects");
        } else if (target.kind === "take") {
          await projectService.removeTake(project.id, target.take.id);
          player.removeTakes([target.take.id]);
        } else {
          await paragraphService.remove(project.id, target.paragraph.id);
          clearTextDrafts([target.paragraph.id]);
          target.onDeleted();
        }
      } catch (failure) {
        setError(describeError(failure, t));
        throw failure;
      }
    });
    if (success) setTarget(null);
    pendingRef.current = false;
    setPending(false);
  };

  let title = "";
  let context = "";
  let description = "";
  let extra = "";
  if (target && project) {
    if (target.kind === "project") {
      title = d.projectTitle;
      context = project.name;
      description = d.projectDescription;
    } else if (target.kind === "take") {
      title = d.takeTitle;
      const paragraphIndex = project.paragraphs.findIndex(
        (paragraph) => paragraph.id === target.take.paragraph_id,
      );
      const paragraph = project.paragraphs[paragraphIndex];
      const takeIndex =
        paragraph?.takes.findIndex((take) => take.id === target.take.id) ?? -1;
      context = `${project.name} · ${paragraphIndex >= 0 ? t.editor.paragraphLabel(paragraphIndex + 1) : t.montage.removedParagraph} · ${takeIndex >= 0 ? t.takes.take(takeIndex + 1) : d.audioFile} · ${formatClock(target.take.duration)}`;
      description = d.takeDescription;
      extra = `${d.createdAt(new Date(target.take.created_at).toLocaleString(locale))} · ${d.takeId(target.take.id)}`;
    } else {
      title = d.paragraphTitle;
      const index = project.paragraphs.findIndex(
        (paragraph) => paragraph.id === target.paragraph.id,
      );
      context = `${project.name} · ${t.editor.paragraphLabel(index + 1)}`;
      description = d.paragraphDescription;
      extra = target.text.trim().slice(0, 240) || d.emptyParagraph;
    }
  }

  return (
    <DeletionContext.Provider
      value={{
        deleteProject: (project) =>
          requestDeletion({ kind: "project", project }),
        deleteTake: (project, take) =>
          requestDeletion({ kind: "take", project, take }),
        deleteParagraph: (project, paragraph, text, onDeleted) =>
          requestDeletion({
            kind: "paragraph",
            project,
            paragraph,
            text,
            onDeleted,
          }),
      }}
    >
      <div className="deletion-surface" inert={target ? true : undefined}>
        {children}
      </div>
      {target && (
        <ConfirmationModal
          title={title}
          confirmLabel={
            target.kind === "project"
              ? d.deleteProject
              : target.kind === "take"
                ? d.deleteTake
                : t.editor.remove
          }
          cancelLabel={t.common.cancel}
          closeLabel={t.common.close}
          pendingLabel={d.deleting}
          pending={pending}
          blocked={!!blockedReason}
          error={error}
          returnFocus={returnFocus}
          onCancel={cancel}
          onConfirm={confirm}
        >
          <strong className="confirmation-context">{context}</strong>
          {extra && <p className="confirmation-detail">{extra}</p>}
          <p>{description}</p>
          {blockedReason && (
            <p className="confirmation-blocked" role="status">
              {blockedReason}
            </p>
          )}
          {target.kind !== "paragraph" && hasActiveJobs && (
            <ButtonLink size="sm" href="/queue" onClick={cancel}>
              {t.dashboard.openQueue}
            </ButtonLink>
          )}
        </ConfirmationModal>
      )}
    </DeletionContext.Provider>
  );
}

export function useDeletion() {
  const context = useContext(DeletionContext);
  if (!context)
    throw new Error("useDeletion must be used inside DeletionProvider");
  return context;
}
