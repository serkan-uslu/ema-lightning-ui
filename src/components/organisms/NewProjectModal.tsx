"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Upload, X } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { describeError } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { readUtf8TextFile } from "@/lib/project";
import { projectService } from "@/services/projects";
import { Button, IconButton } from "../atoms";
import { Field, FileButton } from "../molecules";

export function NewProjectModal() {
  const { t, locale } = useI18n();
  const { newProjectOpen, closeNewProject } = useShell();
  if (!newProjectOpen) return null;
  return <Dialog t={t} locale={locale} close={closeNewProject} />;
}

function Dialog({
  t,
  locale,
  close,
}: {
  t: ReturnType<typeof useI18n>["t"];
  locale: ReturnType<typeof useI18n>["locale"];
  close: () => void;
}) {
  const router = useRouter();
  const { run, busy } = useStudioData();
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const submit = () =>
    run(async () => {
      const project = await projectService.create(name.trim(), text);
      close();
      router.push(`/projects/${project.id}`);
    });

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && !busy) submit();
        }}
      >
        <div className="modal-head">
          <span className="eyebrow">{t.newProject.eyebrow}</span>
          <IconButton label={t.common.close} onClick={close}>
            <X size={20} />
          </IconButton>
        </div>
        <h2 id="new-project-title">{t.newProject.title}</h2>
        <p className="modal-lead">{t.newProject.lead}</p>
        <Field label={t.newProject.name}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.newProject.namePlaceholder}
            maxLength={120}
          />
        </Field>
        <Field label={t.newProject.text}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            placeholder={t.newProject.textPlaceholder}
            maxLength={200000}
          />
        </Field>
        <FileButton
          accept=".txt,text/plain"
          onFile={async (file) => {
            try {
              setText(await readUtf8TextFile(file));
              setFileError("");
            } catch (e) {
              setFileError(describeError(e, t));
            }
          }}
        >
          <Upload size={16} />
          {t.newProject.upload}
        </FileButton>
        {fileError && <p className="error-text">{fileError}</p>}
        <div className="modal-actions">
          <span>{t.common.characters(formatNumber(text.length, locale))}</span>
          <Button
            type="submit"
            variant="primary"
            disabled={!name.trim() || busy}
          >
            {t.newProject.submit} <ArrowRight size={17} />
          </Button>
        </div>
      </form>
    </div>
  );
}
