"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Clapperboard,
  FolderOpen,
  Info,
  LayoutDashboard,
  ListOrdered,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  X,
  Zap,
} from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useStudioData } from "@/controls/StudioDataProvider";
import { BrandMark, IconButton, StatusDot } from "../atoms";
import { NavItem } from "../molecules";

export function Sidebar() {
  const { t } = useI18n();
  const { projects, activeJobs, connected, health } = useStudioData();
  const {
    sidebarCollapsed: collapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  } = useShell();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const projectId = params?.id;
  const closeMobile = () => setMobileNavOpen(false);

  const main = [
    {
      href: "/",
      label: t.nav.dashboard,
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      href: "/projects",
      label: t.nav.projects,
      icon: FolderOpen,
      active: pathname.startsWith("/projects"),
    },
    {
      href: projectId ? `/montage/${projectId}` : "/montage",
      label: t.nav.montage,
      icon: Clapperboard,
      active: pathname.startsWith("/montage"),
    },
    {
      href: "/queue",
      label: t.nav.queue,
      icon: ListOrdered,
      active: pathname.startsWith("/queue"),
      badge: activeJobs.length,
      badgeLabel: t.nav.pendingJobs(activeJobs.length),
    },
  ];
  const secondary = [
    {
      href: "/settings",
      label: t.nav.settings,
      icon: Settings2,
      active: pathname.startsWith("/settings"),
    },
    {
      href: "/about",
      label: t.nav.about,
      icon: Info,
      active: pathname.startsWith("/about"),
    },
  ];

  const model = health?.model.status;
  const engineTone = !connected
    ? "offline"
    : model === "ready"
      ? "online"
      : model === "error"
        ? "offline"
        : "pending";
  const engineText = !connected
    ? t.engine.offline
    : model === "ready"
      ? t.engine.ready(health!.model.device.toUpperCase())
      : model === "error"
        ? t.engine.error
        : t.engine.loading;

  return (
    <>
      {mobileNavOpen && (
        <div
          className="sidebar-scrim"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileNavOpen ? "is-open" : ""}`}
        aria-label={t.nav.workspace}
      >
        <div className="sidebar-head">
          <Link
            className="brand"
            href="/"
            onClick={closeMobile}
            title="EMA Studio"
          >
            <BrandMark />
            <span className="brand-text">
              ema<span className="brand-light">studio</span>
              <small>{t.brand.tagline}</small>
            </span>
          </Link>
          <IconButton
            className="sidebar-close"
            label={t.nav.closeMenu}
            onClick={closeMobile}
          >
            <X size={18} />
          </IconButton>
        </div>

        <p className="sidebar-label">{t.nav.workspace}</p>
        <nav className="sidebar-nav">
          {main.map((item) => (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          ))}
        </nav>

        <div className="sidebar-recent">
          <p className="sidebar-label">{t.nav.recent}</p>
          {projects.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              onClick={closeMobile}
              className={p.id === projectId ? "is-active" : undefined}
            >
              <span className="project-dot" aria-hidden="true" />
              <span>{p.name}</span>
            </Link>
          ))}
          {!projects.length && <small>{t.nav.recentEmpty}</small>}
        </div>

        <div className="sidebar-bottom">
          <div
            className="engine-card"
            title={collapsed ? `${t.engine.name} · ${engineText}` : undefined}
          >
            <div className="engine-head">
              <Zap size={16} aria-hidden="true" />
              <strong>{t.engine.name}</strong>
              <StatusDot tone={engineTone} pulse={engineTone === "pending"} />
            </div>
            <p>{engineText}</p>
            <small>{t.engine.traits}</small>
          </div>
          <nav className="sidebar-nav">
            {secondary.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                collapsed={collapsed}
                onNavigate={closeMobile}
              />
            ))}
          </nav>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-expanded={!collapsed}
            title={collapsed ? t.nav.expand : t.nav.collapse}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span className="nav-label">
              {collapsed ? t.nav.expand : t.nav.collapse}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
