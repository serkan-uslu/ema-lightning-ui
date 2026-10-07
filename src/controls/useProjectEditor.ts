"use client";
import { useCallback, useRef, useState } from "react";
import { selectedTake, splitParagraphs, readUtf8TextFile } from "@/lib/project";
import type { Project } from "@/lib/types";
import { downloadFile } from "@/services/http";
import { paragraphService, type ParagraphPatch } from "@/services/paragraphs";
import { projectService, type ProjectPatch } from "@/services/projects";
import { useI18n } from "./I18nProvider";
import { useStudioData } from "./StudioDataProvider";

/** All editor actions for one project; views stay presentational. */
export function useProjectEditor(project: Project) {
  const { run, busy } = useStudioData();
  const { t } = useI18n();
  const pid = project.id;
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [drafts, setDraftState] = useState<Record<string, string>>({});
  // Mirror of `drafts` for async flushes that outlive a render.
  const draftRef = useRef<Record<string, string>>({});
  const [gap, setGap] = useState(0.35);
  const [exportRate, setExportRate] = useState(48000);

  const updateDrafts = useCallback(
    (fn: (d: Record<string, string>) => Record<string, string>) => {
      draftRef.current = fn(draftRef.current);
      setDraftState(draftRef.current);
    },
    [],
  );

  const textOf = (id: string) =>
    drafts[id] ?? project.paragraphs.find((p) => p.id === id)?.text ?? "";

  const setDraft = (id: string, text: string) =>
    updateDrafts((d) => ({ ...d, [id]: text }));

  const clearDraft = (id: string, text: string) =>
    updateDrafts((d) => {
      if (d[id] !== text) return d;
      const next = { ...d };
      delete next[id];
      return next;
    });

  /** Persists every unsaved paragraph text. */
  const flush = async () => {
    for (const paragraph of project.paragraphs) {
      const value = draftRef.current[paragraph.id];
      if (value !== undefined && value !== paragraph.text) {
        await paragraphService.update(pid, paragraph.id, { text: value });
        clearDraft(paragraph.id, value);
      }
    }
  };

  const commitText = (id: string) => {
    const paragraph = project.paragraphs.find((p) => p.id === id);
    const value = draftRef.current[id];
    if (!paragraph || value === undefined || value === paragraph.text) return;
    run(async () => {
      await paragraphService.update(pid, id, { text: value });
      clearDraft(id, value);
    });
  };

  const toggleChecked = (id: string) =>
    setChecked((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  const allChecked =
    checked.length > 0 && checked.length === project.paragraphs.length;
  const toggleAll = () =>
    setChecked(allChecked ? [] : project.paragraphs.map((p) => p.id));

  const total = project.paragraphs.reduce(
    (sum, p) => sum + (selectedTake(p)?.duration || 0),
    0,
  );

  return {
    busy,
    focusedId,
    focused: project.paragraphs.find((p) => p.id === focusedId),
    focus: setFocusedId,
    checked,
    allChecked,
    toggleChecked,
    toggleAll,
    textOf,
    setDraft,
    commitText,
    totalDuration: total,
    gap,
    setGap,
    exportRate,
    setExportRate,
    saveTexts: () => run(flush),
    rename: (name: string) =>
      name.trim() && name !== project.name
        ? run(() => projectService.update(pid, { name: name.trim() }))
        : Promise.resolve(true),
    updateProject: (values: ProjectPatch) =>
      run(() => projectService.update(pid, values)),
    updateParagraph: (id: string, values: ParagraphPatch) =>
      run(() => paragraphService.update(pid, id, values)),
    generate: (ids?: string[], missingOnly = false) =>
      run(async () => {
        await flush();
        await projectService.generate(pid, ids, missingOnly);
      }),
    move: (index: number, step: number) => {
      const ids = project.paragraphs.map((p) => p.id);
      [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
      return run(() => projectService.reorder(pid, ids));
    },
    split: (id: string, offset: number) =>
      run(async () => {
        await flush();
        await paragraphService.split(pid, id, offset);
      }),
    mergeWithPrevious: (id: string) =>
      run(async () => {
        await flush();
        await paragraphService.mergeWithPrevious(pid, id);
      }),
    remove: (id: string) => {
      setChecked((ids) => ids.filter((x) => x !== id));
      if (focusedId === id) setFocusedId(null);
      return run(() => paragraphService.remove(pid, id));
    },
    addParagraph: () => run(() => paragraphService.add(pid, [""])),
    importText: (file: File) =>
      run(async () => {
        const text = await readUtf8TextFile(file);
        await paragraphService.add(pid, splitParagraphs(text));
      }),
    exportAudio: (format: "wav" | "zip") =>
      run(async () => {
        await flush();
        await downloadFile(
          projectService.exportUrl(pid, {
            format,
            rate: exportRate,
            gap,
            ids: checked,
          }),
          format === "zip" ? t.export.zipName : t.export.wavName,
        );
      }),
  };
}

export type ProjectEditor = ReturnType<typeof useProjectEditor>;
