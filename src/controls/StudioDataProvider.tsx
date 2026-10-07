"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { describeError } from "@/i18n";
import { isActiveJob } from "@/lib/project";
import type { Health, Job, Project } from "@/lib/types";
import { jobService, systemService } from "@/services/jobs";
import { projectService } from "@/services/projects";
import { useI18n } from "./I18nProvider";

const POLL_MS = 2000;
/** Consecutive failed polls before the UI reports the service as offline. */
const OFFLINE_AFTER = 2;

export type Run = (action: () => Promise<unknown>) => Promise<boolean>;

type StudioData = {
  projects: Project[];
  jobs: Job[];
  activeJobs: Job[];
  health: Health | null;
  loaded: boolean;
  connected: boolean;
  /** True once any data arrived; views keep showing it while offline. */
  hasData: boolean;
  busy: boolean;
  error: string;
  clearError: () => void;
  refresh: () => Promise<void>;
  /** Runs a mutation, refreshes data and reports errors in the shell. */
  run: Run;
};

const StudioDataContext = createContext<StudioData | null>(null);

export function StudioDataProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasData, setHasData] = useState(false);
  const failures = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [p, j, h] = await Promise.all([
        projectService.list(),
        jobService.list(),
        systemService.health(),
      ]);
      setProjects(p);
      setJobs(j);
      setHealth(h);
      setConnected(true);
      setHasData(true);
      failures.current = 0;
    } catch {
      // A single dropped poll must not tear down editors.
      failures.current += 1;
      if (failures.current >= OFFLINE_AFTER) setConnected(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, 0);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [refresh]);

  const run = useCallback<Run>(
    async (action) => {
      setBusy(true);
      try {
        await action();
        await refresh();
        return true;
      } catch (e) {
        setError(describeError(e, t));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh, t],
  );

  const value = useMemo(
    () => ({
      projects,
      jobs,
      activeJobs: jobs.filter(isActiveJob),
      health,
      loaded,
      connected,
      hasData,
      busy,
      error,
      clearError: () => setError(""),
      refresh,
      run,
    }),
    [
      projects,
      jobs,
      health,
      loaded,
      connected,
      hasData,
      busy,
      error,
      refresh,
      run,
    ],
  );
  return (
    <StudioDataContext.Provider value={value}>
      {children}
    </StudioDataContext.Provider>
  );
}

export function useStudioData() {
  const context = useContext(StudioDataContext);
  if (!context)
    throw new Error("useStudioData must be used inside StudioDataProvider");
  return context;
}

export function useProject(projectId?: string) {
  const { projects } = useStudioData();
  return projects.find((p) => p.id === projectId);
}
