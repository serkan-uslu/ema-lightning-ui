import React from "react";
import { AbsoluteFill, CanvasImage, Sequence, Composition } from "remotion";
import { Audio, Video } from "@remotion/media";
import type { Aspect, Clip } from "../lib/types";
export type MovieProps = { aspect: Aspect; clips: Clip[] };

const FPS = 30;
const frames = (seconds: number) => Math.round(seconds * FPS);
/** Clip timing in frames; every range is at least one frame long. */
const timing = (c: Clip) => {
  const trimBefore = frames(c.trim);
  return {
    from: frames(c.start),
    durationInFrames: Math.max(1, frames(c.duration)),
    trimBefore,
    trimAfter: Math.max(trimBefore + 1, frames(c.trim + c.duration)),
  };
};
export const movieFrames = (clips: Clip[]) =>
  Math.max(1, ...clips.map((c) => timing(c).from + timing(c).durationInFrames));
export const Movie = ({ clips }: MovieProps) => (
  <AbsoluteFill style={{ backgroundColor: "#101113" }}>
    {clips
      .filter((c) => c.kind !== "audio")
      .map((c) => (
        <Sequence
          key={c.id}
          from={timing(c).from}
          durationInFrames={timing(c).durationInFrames}
        >
          {c.kind === "image" ? (
            <CanvasImage
              src={c.src!}
              style={{ width: "100%", height: "100%", objectFit: c.fit }}
            />
          ) : (
            <Video
              src={c.src!}
              trimBefore={timing(c).trimBefore}
              trimAfter={timing(c).trimAfter}
              volume={c.volume}
              style={{ width: "100%", height: "100%", objectFit: c.fit }}
            />
          )}
        </Sequence>
      ))}
    {clips
      .filter((c) => c.kind === "audio")
      .map((c) => (
        <Sequence
          key={c.id}
          from={timing(c).from}
          durationInFrames={timing(c).durationInFrames}
        >
          <Audio
            src={c.src!}
            trimBefore={timing(c).trimBefore}
            trimAfter={timing(c).trimAfter}
            volume={c.volume}
          />
        </Sequence>
      ))}
  </AbsoluteFill>
);
export const RemotionRoot = () => (
  <Composition
    id="Montage"
    component={Movie}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={30}
    defaultProps={{ aspect: "16:9", clips: [] }}
    calculateMetadata={({ props }) => ({
      durationInFrames: movieFrames(props.clips),
      width: props.aspect === "9:16" ? 1080 : 1920,
      height: props.aspect === "9:16" ? 1920 : 1080,
    })}
  />
);
