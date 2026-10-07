export type BadgeTone = "neutral" | "success" | "progress" | "warning";

const toneOf: Record<string, BadgeTone> = {
  ready: "success",
  completed: "success",
  queued: "progress",
  running: "progress",
  stale: "warning",
  failed: "warning",
  interrupted: "warning",
};

export function Badge({ status, label }: { status: string; label: string }) {
  const tone = toneOf[status] ?? "neutral";
  return (
    <span className={`badge badge-${tone}`} data-status={status}>
      <i aria-hidden="true" />
      {label}
    </span>
  );
}
