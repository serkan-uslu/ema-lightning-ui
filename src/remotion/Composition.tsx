import React from "react";
import { AbsoluteFill, CanvasImage, Sequence, Composition } from "remotion";
import { Audio, Video } from "@remotion/media";
import type { Aspect, Clip } from "../lib/types";
export type MovieProps = { aspect: Aspect; clips: Clip[] };
export const movieFrames = (clips: Clip[]) =>
  Math.max(1, ...clips.map((c) => Math.round((c.start + c.duration) * 30)));
export const Movie = ({ clips }: MovieProps) => (
  <AbsoluteFill style={{ backgroundColor: "#101113" }}>
    {clips
      .filter((c) => c.kind !== "audio")
      .map((c) => (
        <Sequence
          key={c.id}
          from={Math.round(c.start * 30)}
          durationInFrames={Math.max(1, Math.round(c.duration * 30))}
        >
          {c.kind === "image" ? (
            <CanvasImage
              src={c.src!}
              style={{ width: "100%", height: "100%", objectFit: c.fit }}
            />
          ) : (
            <Video
              src={c.src!}
              trimBefore={Math.round(c.trim * 30)}
              trimAfter={Math.round((c.trim + c.duration) * 30)}
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
          from={Math.round(c.start * 30)}
          durationInFrames={Math.max(1, Math.round(c.duration * 30))}
        >
          <Audio
            src={c.src!}
            trimBefore={Math.round(c.trim * 30)}
            trimAfter={Math.round((c.trim + c.duration) * 30)}
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
