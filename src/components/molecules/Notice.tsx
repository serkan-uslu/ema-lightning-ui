import { TriangleAlert, Info, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../atoms";

export function Notice({
  tone = "error",
  children,
  action,
  onDismiss,
  dismissLabel,
}: {
  tone?: "error" | "info";
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  const Icon = tone === "error" ? TriangleAlert : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`notice notice-${tone}`}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{children}</span>
      {action}
      {onDismiss && (
        <IconButton size="sm" label={dismissLabel ?? ""} onClick={onDismiss}>
          <X size={16} />
        </IconButton>
      )}
    </div>
  );
}
