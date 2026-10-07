import Link from "next/link";
import { AudioLines, Clapperboard } from "lucide-react";

/** Connects a project's audio studio and its montage as two tabs. */
export function ProjectTabs({
  projectId,
  active,
  labels,
  clipCount,
  unsaved,
}: {
  projectId: string;
  active: "audio" | "montage";
  labels: { audio: string; montage: string };
  clipCount?: number;
  /** Label shown when the montage has unsaved edits. */
  unsaved?: string;
}) {
  return (
    <nav
      className="project-tabs"
      aria-label={`${labels.audio} / ${labels.montage}`}
    >
      <Link
        href={`/projects/${projectId}`}
        className={active === "audio" ? "is-active" : undefined}
        aria-current={active === "audio" ? "page" : undefined}
      >
        <AudioLines size={16} aria-hidden="true" />
        {labels.audio}
      </Link>
      <Link
        href={`/montage/${projectId}`}
        className={active === "montage" ? "is-active" : undefined}
        aria-current={active === "montage" ? "page" : undefined}
      >
        <Clapperboard size={16} aria-hidden="true" />
        {labels.montage}
        {!!clipCount && <span className="tab-count">{clipCount}</span>}
        {unsaved && (
          <span className="unsaved-dot" title={unsaved} aria-label={unsaved} />
        )}
      </Link>
    </nav>
  );
}
