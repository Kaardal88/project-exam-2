"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
} from "lucide-react";
import { formatSongTime } from "@/lib/utils";
import { TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";

// Placeholder duration until CloudFlare R2 audio (audio_url) is wired up.
const TOTAL_SECONDS = 246;

type Comment = { id: string; timestamp_seconds: number; status: TicketStatus };

type SeekSignal = { seconds: number; nonce: number };

type MediaPlayerProps = {
  comments: Comment[];
  onRequestAddComment: (timestampSeconds: number) => void;
  onPositionChange?: (seconds: number) => void;
  seekSignal?: SeekSignal | null;
};

export function MediaPlayer({
  comments,
  onRequestAddComment,
  onPositionChange,
  seekSignal,
}: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [pendingSeconds, setPendingSeconds] = useState<number | null>(null);
  const [appliedSeekNonce, setAppliedSeekNonce] = useState(seekSignal?.nonce);
  const waveformRef = useRef<HTMLDivElement>(null);

  // Adjusting state in response to a prop change (not an effect) — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (seekSignal && seekSignal.nonce !== appliedSeekNonce) {
    setAppliedSeekNonce(seekSignal.nonce);
    setCurrentSeconds(seekSignal.seconds);
    setPendingSeconds(null);
  }

  const bars = useMemo(() => {
    // Deterministic pseudo-random hash per bar index, no mutable closure state.
    return Array.from({ length: 80 }, (_, i) => {
      const hash = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      return 20 + hash * 80;
    });
  }, []);

  useEffect(() => {
    onPositionChange?.(currentSeconds);
  }, [currentSeconds, onPositionChange]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSeconds((prev) => {
        if (prev >= TOTAL_SECONDS) {
          setIsPlaying(false);
          return TOTAL_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  function secondsFromClientX(clientX: number) {
    const el = waveformRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(fraction * TOTAL_SECONDS);
  }

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const seconds = secondsFromClientX(e.clientX);
    if (seconds === null) return;

    setCurrentSeconds(seconds);
    setPendingSeconds(isPlaying ? null : seconds);
  }

  function jumpToComment(direction: "prev" | "next") {
    if (comments.length === 0) return;

    const sorted = comments
      .map((comment) => comment.timestamp_seconds)
      .sort((a, b) => a - b);

    if (direction === "next") {
      const next = sorted.find((t) => t > currentSeconds);
      setCurrentSeconds(next ?? sorted[sorted.length - 1]);
    } else {
      const before = sorted.filter((t) => t < currentSeconds);
      setCurrentSeconds(before.length ? before[before.length - 1] : sorted[0]);
    }

    setPendingSeconds(null);
  }

  const progressPercent = (currentSeconds / TOTAL_SECONDS) * 100;
  const pendingPercent =
    pendingSeconds !== null ? (pendingSeconds / TOTAL_SECONDS) * 100 : null;

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={() => {
            setIsPlaying((prev) => !prev);
            setPendingSeconds(null);
          }}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-black transition hover:cursor-pointer hover:bg-yellow-200"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="ml-0.5 h-5 w-5" />
          )}
        </button>

        <button
          onClick={() => jumpToComment("prev")}
          className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
          aria-label="Jump to previous comment"
          title="Jump to previous comment"
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={() => jumpToComment("next")}
          className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
          aria-label="Jump to next comment"
          title="Jump to next comment"
        >
          <SkipForward className="h-4 w-4" />
        </button>

        <span className="w-10 shrink-0 text-xs text-neutral-400">
          {formatSongTime(currentSeconds)}
        </span>

        <div className="relative flex-1">
          {pendingSeconds !== null && pendingPercent !== null && (
            <button
              onClick={() => {
                onRequestAddComment(pendingSeconds);
                setPendingSeconds(null);
              }}
              style={{ left: `${pendingPercent}%` }}
              className="absolute -top-9 -translate-x-1/2 whitespace-nowrap rounded-md border border-yellow-200 bg-neutral-950 px-2 py-1 text-xs font-semibold text-yellow-100 shadow-lg transition hover:cursor-pointer hover:bg-neutral-800"
            >
              Comment?
            </button>
          )}

          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            className="relative flex h-10 cursor-pointer items-end gap-[1px] overflow-hidden rounded-sm bg-neutral-950 px-1"
          >
            {bars.map((height, i) => {
              const barPercent = (i / bars.length) * 100;
              const played = barPercent <= progressPercent;

              return (
                <span
                  key={i}
                  style={{ height: `${height}%` }}
                  className={`min-w-px flex-1 rounded-full ${
                    played ? "bg-yellow-100" : "bg-neutral-700"
                  }`}
                />
              );
            })}

            <span
              style={{ left: `${progressPercent}%` }}
              className="absolute top-0 h-full w-px bg-yellow-300"
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 -bottom-2 h-2">
            {comments.map((comment) => (
              <button
                key={comment.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSeconds(comment.timestamp_seconds);
                  setPendingSeconds(null);
                }}
                title={`${TICKET_STATUS_STYLES[comment.status].label} ticket at ${formatSongTime(comment.timestamp_seconds)}`}
                style={{
                  left: `${(comment.timestamp_seconds / TOTAL_SECONDS) * 100}%`,
                }}
                className={`pointer-events-auto absolute h-2 w-2 -translate-x-1/2 rounded-full ring-1 ring-neutral-950 hover:cursor-pointer ${TICKET_STATUS_STYLES[comment.status].dot}`}
              />
            ))}
          </div>
        </div>

        <span className="w-10 shrink-0 text-xs text-neutral-400">
          {formatSongTime(TOTAL_SECONDS)}
        </span>

        <Volume2
          className="h-4 w-4 shrink-0 text-neutral-500"
          aria-hidden="true"
        />

        <button
          disabled
          title="Coming soon"
          className="hidden shrink-0 items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-500 cursor-not-allowed sm:flex"
        >
          Expand player
          <Maximize2 className="h-3 w-3" />
        </button>
      </div>
    </section>
  );
}
