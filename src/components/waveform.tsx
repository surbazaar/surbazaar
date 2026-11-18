"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { type Track, TrackPlayButton, usePlayer } from "./player";

/** Waveform view that drives the shared bottom player, so only one audio plays at a time. */
export function Waveform({ track }: { track: Track }) {
  const el = useRef<HTMLDivElement>(null);
  const ws = useRef<WaveSurfer | null>(null);
  const { current, audio, toggle } = usePlayer();
  const isCurrent = current?.id === track.id;

  useEffect(() => {
    if (!el.current) return;
    const w = WaveSurfer.create({
      container: el.current,
      url: track.src,
      height: 72,
      waveColor: "#4a3d2e",
      progressColor: "#f2a531",
      cursorWidth: 0,
      barWidth: 2,
      barGap: 2,
      barRadius: 2,
      interact: true,
    });
    ws.current = w;
    return () => w.destroy();
  }, [track.src]);

  // Mirror the shared player's position onto the waveform.
  useEffect(() => {
    if (!audio || !isCurrent) return;
    const sync = () => ws.current?.setTime(audio.currentTime);
    audio.addEventListener("timeupdate", sync);
    return () => audio.removeEventListener("timeupdate", sync);
  }, [audio, isCurrent]);

  // Clicking the waveform seeks the shared player.
  useEffect(() => {
    const w = ws.current;
    if (!w) return;
    const unsub = w.on("interaction", (t: number) => {
      if (!audio) return;
      if (!isCurrent) {
        toggle(track);
        audio.addEventListener("loadedmetadata", () => (audio.currentTime = t), { once: true });
      } else {
        audio.currentTime = t;
      }
    });
    return () => unsub();
  }, [audio, isCurrent, toggle, track]);

  return (
    <div className="flex items-center gap-4">
      <TrackPlayButton track={track} size="lg" />
      <div ref={el} className="min-w-0 flex-1" />
    </div>
  );
}
