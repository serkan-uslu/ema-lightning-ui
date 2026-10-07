"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerRef } from "@remotion/player";
import { FPS, selectedTakes } from "@/lib/project";
import type { Asset, Clip, Project, Take, Timeline } from "@/lib/types";
import { projectService } from "@/services/projects";
import { useAudioPlayer } from "./AudioPlayerProvider";
import { useDrafts } from "./DraftsProvider";
import { useStudioData } from "./StudioDataProvider";

export const ZOOM_LEVELS = [24, 48, 96, 192] as const; // px per second
const MIN_TIMELINE_SECONDS = 5;
/** Shortest clip: one frame. The backend enforces the same limit. */
export const MIN_CLIP_SECONDS = 1 / FPS;
const toFrame = (seconds: number) => Math.round(seconds * FPS) / FPS;

const isAudioLane = (kind: Clip["kind"]) => kind === "audio";

/** Timeline editing, preview sync and persistence for one project. */
export function useMontageEditor(project: Project) {
  const { run, busy } = useStudioData();
  const { pause: pauseAudio, playing: audioPlaying } = useAudioPlayer();
  const pid = project.id;
  const playerRef = useRef<PlayerRef>(null);
  // Unsaved edits are kept in DraftsProvider; `null` = showing the saved timeline.
  const { montage, setMontage } = useDrafts();
  const draft = montage[pid] ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [zoomIndex, setZoomIndex] = useState(1);
  const timeline = draft ?? project.timeline;
  const dirty = draft !== null;

  const allTakes = project.all_takes?.length
    ? project.all_takes
    : project.paragraphs.flatMap((p) => p.takes);
  const takes = selectedTakes(project);
  const sourceOf = (clip: Clip): Take | Asset | undefined =>
    clip.kind === "audio"
      ? allTakes.find((t) => t.id === clip.source_id)
      : project.assets.find((a) => a.id === clip.source_id);
  const clips = timeline.clips.map((c) => ({ ...c, src: sourceOf(c)?.url }));
  const end = Math.max(0, ...clips.map((c) => c.start + c.duration));
  const visibleSeconds = Math.max(MIN_TIMELINE_SECONDS, Math.ceil(end + 1));
  const selected = timeline.clips.find((c) => c.id === selectedId);
  const hasClips = clips.length > 0;

  // Keep preview position in state and stop the shared audio player while the
  // montage preview plays (and vice versa), so two sources never overlap.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const onFrame = (e: { detail: { frame: number } }) =>
      setFrame(e.detail.frame);
    const onPlay = () => pauseAudio();
    player.addEventListener("frameupdate", onFrame);
    player.addEventListener("seeked", onFrame);
    player.addEventListener("play", onPlay);
    return () => {
      player.removeEventListener("frameupdate", onFrame);
      player.removeEventListener("seeked", onFrame);
      player.removeEventListener("play", onPlay);
    };
  }, [hasClips, pauseAudio]);

  useEffect(() => {
    if (audioPlaying) playerRef.current?.pause();
  }, [audioPlaying]);

  const change = useCallback(
    (next: Timeline) => setMontage(pid, next),
    [pid, setMontage],
  );

  const patchSelected = (values: Partial<Clip>) => {
    const next = { ...values };
    if (next.duration !== undefined)
      next.duration = Math.max(MIN_CLIP_SECONDS, next.duration);
    change({
      ...timeline,
      clips: timeline.clips.map((c) =>
        c.id === selectedId ? { ...c, ...next } : c,
      ),
    });
  };

  const append = (items: (Take | Asset)[]) => {
    const next = [...timeline.clips];
    let lastId: string | null = null;
    for (const item of items) {
      const kind = "kind" in item ? item.kind : "audio";
      const start = Math.max(
        0,
        ...next
          .filter((c) => isAudioLane(c.kind) === isAudioLane(kind))
          .map((c) => c.start + c.duration),
      );
      lastId = crypto.randomUUID();
      next.push({
        id: lastId,
        source_id: item.id,
        kind,
        label: "name" in item ? item.name : item.text.slice(0, 60),
        start,
        trim: 0,
        duration: item.duration,
        volume: kind === "video" ? 0 : 1,
        fit: "cover",
      });
    }
    setSelectedId(lastId);
    change({ ...timeline, clips: next });
  };

  const seekSeconds = (seconds: number) => {
    const target = Math.max(0, Math.round(seconds * FPS));
    playerRef.current?.seekTo(target);
    setFrame(target);
  };

  const select = (id: string | null) => {
    setSelectedId(id);
    const clip = timeline.clips.find((c) => c.id === id);
    if (clip) seekSeconds(clip.start);
  };

  const moveClip = (id: string, start: number) =>
    change({
      ...timeline,
      clips: timeline.clips.map((c) =>
        c.id === id
          ? { ...c, start: Math.max(0, Math.round(start * 10) / 10) }
          : c,
      ),
    });

  // Both halves must be at least one frame long.
  const canSplit = !!selected && selected.duration >= 2 * MIN_CLIP_SECONDS;
  const split = () => {
    if (!selected || !canSplit) return;
    let at = frame / FPS - selected.start;
    if (at < MIN_CLIP_SECONDS || at > selected.duration - MIN_CLIP_SECONDS)
      at = selected.duration / 2;
    at = Math.min(
      selected.duration - MIN_CLIP_SECONDS,
      Math.max(MIN_CLIP_SECONDS, toFrame(at)),
    );
    const second: Clip = {
      ...selected,
      id: crypto.randomUUID(),
      start: selected.start + at,
      trim: selected.kind === "image" ? 0 : selected.trim + at,
      duration: selected.duration - at,
    };
    change({
      ...timeline,
      clips: timeline.clips.flatMap((c) =>
        c.id === selected.id ? [{ ...c, duration: at }, second] : [c],
      ),
    });
    setSelectedId(second.id);
  };

  const removeClip = (id: string) => {
    change({ ...timeline, clips: timeline.clips.filter((c) => c.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  // Clear the draft only if nothing changed while the request was in flight.
  const persist = async () => {
    const saving = timeline;
    await projectService.saveTimeline(pid, saving);
    setMontage(pid, (current) => (current === saving ? null : current));
  };

  const save = () => run(persist);

  const render = () =>
    run(async () => {
      await persist();
      await projectService.render(pid);
    });

  const selectedSource = selected ? sourceOf(selected) : undefined;
  const overflow =
    !!selected &&
    selected.kind !== "image" &&
    !!selectedSource &&
    selected.trim + selected.duration > selectedSource.duration + 0.04;

  return {
    busy,
    playerRef,
    timeline,
    clips,
    takes,
    allTakes,
    dirty,
    frame,
    seconds: frame / FPS,
    end,
    visibleSeconds,
    pxPerSecond: ZOOM_LEVELS[zoomIndex],
    canZoomIn: zoomIndex < ZOOM_LEVELS.length - 1,
    canZoomOut: zoomIndex > 0,
    zoomIn: () => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1)),
    zoomOut: () => setZoomIndex((z) => Math.max(0, z - 1)),
    selected,
    selectedSource,
    overflow,
    select,
    /** Keyboard focus selects a clip without moving the playhead. */
    focusClip: setSelectedId,
    seekSeconds,
    setAspect: (aspect: Timeline["aspect"]) => change({ ...timeline, aspect }),
    patchSelected,
    append,
    moveClip,
    split,
    canSplit,
    removeClip,
    removeSelected: () => selectedId && removeClip(selectedId),
    save,
    render,
    upload: (file: File) => run(() => projectService.uploadAsset(pid, file)),
    renderJobs: project.jobs.filter((j) => j.kind === "render"),
  };
}

/** Editor state without the player ref (refs must not be read during render). */
export type MontageEditor = Omit<
  ReturnType<typeof useMontageEditor>,
  "playerRef"
>;
export type MontagePlayerRef = ReturnType<typeof useMontageEditor>["playerRef"];
