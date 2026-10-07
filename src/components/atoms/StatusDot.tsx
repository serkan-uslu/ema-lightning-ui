export type StatusTone = "online" | "pending" | "offline";

export function StatusDot({
  tone,
  pulse,
}: {
  tone: StatusTone;
  pulse?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`status-dot status-${tone} ${pulse ? "pulse" : ""}`}
    />
  );
}
