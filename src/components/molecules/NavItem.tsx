import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function NavItem({
  href,
  label,
  icon: Icon,
  active,
  badge,
  badgeLabel,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
  badgeLabel?: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      className={`nav-item ${active ? "is-active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
    >
      <Icon size={19} aria-hidden="true" />
      <span className="nav-label">{label}</span>
      {!!badge && (
        <b className="nav-badge" aria-label={badgeLabel}>
          {badge}
        </b>
      )}
    </Link>
  );
}
