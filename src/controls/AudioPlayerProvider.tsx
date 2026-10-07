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
import type { Take } from "@/lib/types";

/**
 * One shared <audio> element for the whole app. Paragraph cards, the take
 * list and the bottom player bar all read and drive the same playback state,
 * so play/pause/progress stay in sync everywhere and survive navigation.
 */
type PlayerControls = {
  queue: Take[];
  index: number;
  current: Take | undefined;
  playing: boolean;
  volume: number;
  playQueue: (takes: Take[], startIndex?: number) => void;
  /** Plays `take` (inside `queue` when given) or toggles it if it is current. */
  toggleTake: (take: Take, queue?: Take[]) => void;
  toggle: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  previous: () => void;
  setVolume: (volume: number) => void;
  close: () => void;
  /** Removes deleted sources from playback; resets if the current source was deleted. */
  removeTakes: (ids: string[]) => void;
};

type PlayerClock = { time: number; duration: number };

const ControlsContext = createContext<PlayerControls | null>(null);
const ClockContext = createContext<PlayerClock>({ time: 0, duration: 0 });

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Take[]>([]);
  const [index, setIndex] = useState(0);
  // Bumped on every explicit "load this track" so replaying the same take works.
  const [loadToken, setLoadToken] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const current = queue[index];
  const currentUrl = current?.url;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentUrl) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    audio.src = currentUrl;
    audio.currentTime = 0;
    audio.play().catch(() => undefined);
  }, [currentUrl, loadToken]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (audioRef.current) setTime(audioRef.current.currentTime);
    }, 100);
    return () => clearInterval(timer);
  }, [playing]);

  const playQueue = useCallback((takes: Take[], startIndex = 0) => {
    if (!takes.length) return;
    setQueue(takes);
    setIndex(Math.min(Math.max(0, startIndex), takes.length - 1));
    setTime(0);
    setDuration(takes[startIndex]?.duration ?? 0);
    setLoadToken((n) => n + 1);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  const toggleTake = useCallback(
    (take: Take, list?: Take[]) => {
      if (current?.id === take.id) return toggle();
      const takes = list?.length ? list : [take];
      playQueue(
        takes,
        takes.findIndex((t) => t.id === take.id),
      );
    },
    [current?.id, playQueue, toggle],
  );

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    audio.currentTime = Math.max(0, seconds);
    setTime(audio.currentTime);
  }, []);

  const go = useCallback(
    (step: number) => {
      const target = index + step;
      if (target < 0 || target >= queue.length) return;
      setIndex(target);
      setTime(0);
      setLoadToken((n) => n + 1);
    },
    [index, queue.length],
  );

  const previous = useCallback(() => {
    // Like most players: restart the track unless we are at its very start.
    if ((audioRef.current?.currentTime ?? 0) > 2 || index === 0) seek(0);
    else go(-1);
  }, [go, index, seek]);

  const setVolume = useCallback((value: number) => {
    setVolumeState(value);
    if (audioRef.current) audioRef.current.volume = value;
  }, []);

  const close = useCallback(() => {
    audioRef.current?.pause();
    setQueue([]);
    setIndex(0);
    setTime(0);
    setDuration(0);
    setPlaying(false);
  }, []);

  const removeTakes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const deleted = new Set(ids);
      if (current && deleted.has(current.id)) {
        close();
        return;
      }
      const next = queue.filter((take) => !deleted.has(take.id));
      if (next.length === queue.length) return;
      setQueue(next);
      setIndex(
        Math.max(
          0,
          next.findIndex((take) => take.id === current?.id),
        ),
      );
    },
    [close, current, queue],
  );

  const controls = useMemo(
    () => ({
      queue,
      index,
      current,
      playing,
      volume,
      playQueue,
      toggleTake,
      toggle,
      pause,
      seek,
      next: () => go(1),
      previous,
      setVolume,
      close,
      removeTakes,
    }),
    [
      queue,
      index,
      current,
      playing,
      volume,
      playQueue,
      toggleTake,
      toggle,
      pause,
      seek,
      go,
      previous,
      setVolume,
      close,
      removeTakes,
    ],
  );
  const clock = useMemo(() => ({ time, duration }), [time, duration]);

  return (
    <ControlsContext.Provider value={controls}>
      <ClockContext.Provider value={clock}>
        {children}
        <audio
          ref={audioRef}
          preload="metadata"
          hidden
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onEnded={() => {
            if (index + 1 < queue.length) go(1);
          }}
        />
      </ClockContext.Provider>
    </ControlsContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(ControlsContext);
  if (!context)
    throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  return context;
}

export const usePlaybackClock = () => useContext(ClockContext);

/** Playback state of one take, for cards and lists that show it. */
export function useTakePlayback(takeId: string | undefined) {
  const { current, playing } = useAudioPlayer();
  const { time, duration } = usePlaybackClock();
  const isCurrent = !!takeId && current?.id === takeId;
  return {
    isCurrent,
    playing: isCurrent && playing,
    progress: isCurrent && duration > 0 ? Math.min(1, time / duration) : 0,
  };
}
