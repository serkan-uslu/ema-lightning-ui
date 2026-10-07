import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Titled card used by inspectors and side panels. */
export function Panel({
  icon: Icon,
  title,
  aside,
  children,
  className = "",
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-title">
          {Icon && <Icon size={17} aria-hidden="true" />}
          <h3>{title}</h3>
          {aside && <div className="panel-aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function SettingLine({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="setting-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}
