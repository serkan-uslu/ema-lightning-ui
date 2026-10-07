import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  lead,
  actions,
  children,
}: {
  eyebrow: string;
  title?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  /** Replaces the default <h1> (e.g. an editable title). */
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div className="page-heading-copy">
        <p className="eyebrow">{eyebrow}</p>
        {children ?? <h1>{title}</h1>}
        {lead && <p className="lead">{lead}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </header>
  );
}

export function SectionHeading({
  title,
  count,
  lead,
  action,
}: {
  title: string;
  count?: number;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>
          {title}
          {count !== undefined && <span className="count">{count}</span>}
        </h2>
        {lead && <p>{lead}</p>}
      </div>
      {action}
    </div>
  );
}
