"use client";
import { Download, FileArchive } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import type { ProjectEditor } from "@/controls/useProjectEditor";
import { formatKhz } from "@/lib/format";
import { SAMPLE_RATES } from "@/lib/project";
import type { Project } from "@/lib/types";
import { Button } from "../atoms";
import { Field, Panel } from "../molecules";

export function ExportPanel({
  project,
  editor,
}: {
  project: Project;
  editor: ProjectEditor;
}) {
  const { t } = useI18n();
  const e = t.export;
  const disabled = editor.busy || !project.paragraphs.length;
  return (
    <Panel icon={Download} title={e.title} className="inspector-panel">
      <p className="hint">
        {editor.checked.length
          ? e.scopeSelected(editor.checked.length)
          : e.scopeAll}{" "}
        · WAV / ZIP
      </p>
      <div className="override-grid">
        <Field label={e.gap}>
          <input
            type="number"
            min={0}
            max={10}
            step={0.05}
            value={editor.gap}
            onChange={(ev) => editor.setGap(Number(ev.target.value))}
          />
        </Field>
        <Field label={e.rate}>
          <select
            value={editor.exportRate}
            onChange={(ev) => editor.setExportRate(Number(ev.target.value))}
          >
            {SAMPLE_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {formatKhz(rate)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="stack-sm">
        <Button
          block
          variant="primary"
          disabled={disabled}
          onClick={() => editor.exportAudio("wav")}
        >
          <Download size={16} />
          {e.wav}
        </Button>
        <Button
          block
          disabled={disabled}
          onClick={() => editor.exportAudio("zip")}
        >
          <FileArchive size={16} />
          {e.zip}
        </Button>
      </div>
      <p className="hint">{e.hint}</p>
    </Panel>
  );
}
