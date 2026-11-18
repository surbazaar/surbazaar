"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type Track = { id: string; title: string; producer: string; src: string; artwork?: string | null };

type Ctx = {
  current: Track | null;
  playing: boolean;
  toggle: (t: Track) => void;
  audio: HTMLAudioElement | null;
};

const PlayerContext = createContext<Ctx>({ current: null, playing: false, toggle: () => {}, audio: null });
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [audio] = useState<HTMLAudioElement | null>(() => {
    if (typeof window === "undefined") return null;
    const a = new Audio();
    a.preload = "none";
    return a;
  });
  const audioRef = useRef(audio);
  const [current, setCurrent] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => {
    const a = audio;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    a.addEventListener("timeupdate", onTime);
    return () => {
      a.pause();
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
      a.removeEventListener("timeupdate", onTime);
    };
  }, [audio]);

  const toggle = useCallback(
    (t: Track) => {
      const a = audioRef.current;
      if (!a) return;
      if (current?.id === t.id) {
        if (a.paused) a.play();
        else a.pause();
        return;
      }
      a.src = t.src;
      a.play();
      setCurrent(t);
      if (!counted.current.has(t.id)) {
        counted.current.add(t.id);
        createClient().rpc("increment_play", { p_beat: t.id }).then(() => {});
      }
    },
    [current],
  );

  return (
    <PlayerContext.Provider value={{ current, playing, toggle, audio }}>
      {children}
      {current && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 backdrop-blur">
          <div
            className="h-1 cursor-pointer bg-line"
            onClick={(e) => {
              const a = audioRef.current;
              if (!a?.duration) return;
              const r = e.currentTarget.getBoundingClientRect();
              a.currentTime = ((e.clientX - r.left) / r.width) * a.duration;
            }}
          >
            <div className="h-full bg-saffron" style={{ width: `${progress * 100}%` }} />
          </div>
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <PlayButton playing={playing} onClick={() => toggle(current)} />
            <div className="min-w-0">
              <Link href={`/beats/${current.id}`} className="block truncate font-semibold hover:text-saffron">
                {current.title}
              </Link>
              <div className="truncate text-xs text-muted">{current.producer}</div>
            </div>
            <span className="ml-auto hidden text-xs text-muted sm:block">Tagged preview</span>
          </div>
        </div>
      )}
    </PlayerContext.Provider>
  );
}

export function PlayButton({ playing, onClick, size = "md" }: { playing: boolean; onClick: () => void; size?: "md" | "lg" }) {
  const s = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  return (
    <button
      type="button"
      aria-label={playing ? "Pause" : "Play"}
      onClick={onClick}
      className={`${s} grid shrink-0 place-items-center rounded-full bg-saffron text-ink transition hover:scale-105`}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="ml-0.5 h-1/2 w-1/2" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
      )}
    </button>
  );
}

export function TrackPlayButton({ track, size }: { track: Track; size?: "md" | "lg" }) {
  const { current, playing, toggle } = usePlayer();
  return <PlayButton size={size} playing={current?.id === track.id && playing} onClick={() => toggle(track)} />;
}
