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
import type { MutableRefObject, ReactNode } from "react";
import type { Timeline } from "@/lib/types";

type MontageUpdate =
  Timeline | null | ((current: Timeline | null) => Timeline | null);
type TextDrafts = Record<string, string>;

/**
 * Unsaved edits live here, above every page, so they survive in-app
 * navigation and editors being unmounted (e.g. while the service reconnects).
 */
type DraftsContextValue = {
  montage: Record<string, Timeline>;
  setMontage: (projectId: string, update: MontageUpdate) => void;
  /** Paragraph text drafts keyed by paragraph id. */
  texts: TextDrafts;
  /** Latest text drafts for async flushes that outlive a render. */
  textsRef: MutableRefObject<TextDrafts>;
  updateTexts: (fn: (drafts: TextDrafts) => TextDrafts) => void;
};

const DraftsContext = createContext<DraftsContextValue | null>(null);

export function DraftsProvider({ children }: { children: ReactNode }) {
  const [montage, setMontageState] = useState<Record<string, Timeline>>({});
  const [texts, setTexts] = useState<TextDrafts>({});
  const textsRef = useRef<TextDrafts>({});

  const setMontage = useCallback((projectId: string, update: MontageUpdate) => {
    setMontageState((all) => {
      const current = all[projectId] ?? null;
      const next = typeof update === "function" ? update(current) : update;
      if (next === current) return all;
      const copy = { ...all };
      if (next) copy[projectId] = next;
      else delete copy[projectId];
      return copy;
    });
  }, []);

  const updateTexts = useCallback((fn: (drafts: TextDrafts) => TextDrafts) => {
    textsRef.current = fn(textsRef.current);
    setTexts(textsRef.current);
  }, []);

  const unsaved =
    Object.keys(montage).length > 0 || Object.keys(texts).length > 0;
  useEffect(() => {
    if (!unsaved) return;
    const listener = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [unsaved]);

  const value = useMemo(
    () => ({ montage, setMontage, texts, textsRef, updateTexts }),
    [montage, setMontage, texts, updateTexts],
  );
  return (
    <DraftsContext.Provider value={value}>{children}</DraftsContext.Provider>
  );
}

export function useDrafts() {
  const context = useContext(DraftsContext);
  if (!context) throw new Error("useDrafts must be used inside DraftsProvider");
  return context;
}
