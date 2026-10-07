"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { writePreferenceCookie } from "@/lib/cookies";
import { SIDEBAR_COOKIE } from "@/lib/preferences";

type ShellContextValue = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  newProjectOpen: boolean;
  openNewProject: () => void;
  closeNewProject: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

/** Layout state shared by the sidebar, top bar and pages. */
export function ShellProvider({
  initialCollapsed,
  children,
}: {
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const [sidebarCollapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const toggleSidebar = useCallback(() => {
    setCollapsed((current) => {
      writePreferenceCookie(SIDEBAR_COOKIE, current ? "expanded" : "collapsed");
      return !current;
    });
  }, []);
  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      mobileNavOpen,
      setMobileNavOpen,
      newProjectOpen,
      openNewProject: () => setNewProjectOpen(true),
      closeNewProject: () => setNewProjectOpen(false),
    }),
    [sidebarCollapsed, toggleSidebar, mobileNavOpen, newProjectOpen],
  );
  return (
    <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
  );
}

export function useShell() {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside ShellProvider");
  return context;
}
