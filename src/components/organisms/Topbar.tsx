"use client";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ChevronRight, Menu, Plus } from "lucide-react";
import { useI18n } from "@/controls/I18nProvider";
import { useShell } from "@/controls/ShellProvider";
import { useProject, useStudioData } from "@/controls/StudioDataProvider";
import { Button, IconButton, StatusDot } from "../atoms";
import { LanguageSwitch } from "./LanguageSwitch";

type Crumb = { label: string; href?: string };

export function Topbar() {
  const { t } = useI18n();
  const { connected, loaded } = useStudioData();
  const { openNewProject, setMobileNavOpen } = useShell();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const project = useProject(params?.id);
  const section = pathname.split("/")[1] || "";

  const sections: Record<string, Crumb> = {
    "": { label: t.nav.dashboard },
    projects: { label: t.nav.projects, href: "/projects" },
    montage: { label: t.nav.montage, href: "/montage" },
    queue: { label: t.nav.queue },
    settings: { label: t.nav.settings },
    about: { label: t.nav.about },
  };
  const crumbs: Crumb[] = [sections[section] ?? { label: section }];
  if (params?.id) crumbs.push({ label: project?.name ?? "…" });

  return (
    <header className="topbar">
      <IconButton
        className="topbar-menu"
        label={t.nav.openMenu}
        onClick={() => setMobileNavOpen(true)}
      >
        <Menu size={20} />
      </IconButton>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <span className="crumb-root">{t.nav.workspace}</span>
        {crumbs.map((crumb, i) => (
          <span key={i} className="crumb">
            <ChevronRight size={14} aria-hidden="true" />
            {crumb.href && i < crumbs.length - 1 ? (
              <Link href={crumb.href}>{crumb.label}</Link>
            ) : (
              <strong aria-current="page">{crumb.label}</strong>
            )}
          </span>
        ))}
      </nav>
      <div className="topbar-actions">
        {loaded && (
          <span className={`connection-tag ${connected ? "" : "is-offline"}`}>
            <StatusDot tone={connected ? "online" : "offline"} />
            <span>{connected ? t.topbar.online : t.topbar.offline}</span>
          </span>
        )}
        <LanguageSwitch />
        <Button
          variant="primary"
          size="sm"
          onClick={openNewProject}
          disabled={!connected}
        >
          <Plus size={16} />
          <span className="hide-sm">{t.topbar.newProject}</span>
        </Button>
      </div>
    </header>
  );
}
