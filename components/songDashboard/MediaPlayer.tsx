"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { formatSongTime } from "@/lib/utils";
import { RAW_PEAK_COUNT, peaksFromBuffer, resampleBars } from "@/lib/waveform";
import { TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";

// Placeholder duration used until real audio is uploaded/loaded.
const PLACEHOLDER_TOTAL_SECONDS = 246;

const MIN_BARS = 60;
const MAX_BARS = RAW_PEAK_COUNT;
const PIXELS_PER_BAR = 3;

// Decodes the audio into peak amplitudes, at RAW_PEAK_COUNT resolution.
async function computeWaveformPeaks(audioUrl: string): Promise<number[]> {
  // no-store: the <audio> element already fetched this same URL in
  // no-cors mode for playback, so a cached/revalidated (304) response
  // here would carry no CORS headers and fail the cors-mode fetch below.
  const response = await fetch(audioUrl, { cache: "no-store" });
  const arrayBuffer = await response.arrayBuffer();

  const audioContext = new AudioContext();

  try {
    return peaksFromBuffer(await audioContext.decodeAudioData(arrayBuffer));
  } finally {
    void audioContext.close();
  }
}

type Comment = { id: string; timestamp_seconds: number; status: TicketStatus };

type SeekSignal = { seconds: number; nonce: number };

type MediaPlayerProps = {
  audioUrl: string | null;
  comments: Comment[];
  onRequestAddComment: (timestampSeconds: number) => void;
  onPositionChange?: (seconds: number) => void;
  seekSignal?: SeekSignal | null;
  onAudioUrlExpired: () => void;
  /** Takes the listener to the studio, where the stems and the history are. */
  onOpenStudio: () => void;
  /** Hides the card until the page is reloaded. */
  onClose: () => void;
};

/**
 * The song as one file, on the dashboard.
 *
 * Deliberately the simple half of playback: one mixdown, the comment markers
 * that hang off it, and a way through to the studio. Stems, versions and
 * anything that decides what the song *is* live in the Studio tab, which has
 * the width for it — this card used to open a blurred overlay to make room,
 * and an overlay is a worse workspace than a page.
 */
export function MediaPlayer({
  audioUrl,
  comments,
  onRequestAddComment,
  onPositionChange,
  seekSignal,
  onAudioUrlExpired,
  onOpenStudio,
  onClose,
}: MediaPlayerProps) {
  const hasRealAudio = Boolean(audioUrl);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState(PLACEHOLDER_TOTAL_SECONDS);
  const [pendingSeconds, setPendingSeconds] = useState<number | null>(null);
  const [appliedSeekNonce, setAppliedSeekNonce] = useState(seekSignal?.nonce);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [appliedAudioUrl, setAppliedAudioUrl] = useState(audioUrl);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const waveformRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasRetriedAfterError = useRef(false);

  // Adjusting state in response to a prop change (not an effect) — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // Refs can't be touched during render, so a real-audio seek is deferred to
  // the effect below via `seekTarget` instead of writing audioRef here.
  if (seekSignal && seekSignal.nonce !== appliedSeekNonce) {
    setAppliedSeekNonce(seekSignal.nonce);
    setPendingSeconds(null);

    if (hasRealAudio) {
      setSeekTarget(seekSignal.seconds);
    } else {
      setCurrentSeconds(seekSignal.seconds);
    }
  }

  if (hasRealAudio && audioUrl !== appliedAudioUrl) {
    setAppliedAudioUrl(audioUrl);
    setCurrentSeconds(0);
    setIsPlaying(false);
    setAudioError(null);
  }

  // Deterministic pseudo-random hash per bar index — shown until the real
  // waveform is decoded, and as a fallback if decoding fails.
  const placeholderBars = useMemo(() => {
    return Array.from({ length: RAW_PEAK_COUNT }, (_, i) => {
      const hash = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      return 20 + hash * 80;
    });
  }, []);

  const [realBars, setRealBars] = useState<number[] | null>(null);

  // How many bars actually fit the waveform's rendered width — recomputed
  // whenever the container resizes, so wide players show more detail
  // instead of being stuck with the same fixed bar count as mobile.
  const [barCount, setBarCount] = useState(MIN_BARS);

  useEffect(() => {
    const el = waveformRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (!width) return;

      setBarCount(
        Math.min(MAX_BARS, Math.max(MIN_BARS, Math.round(width / PIXELS_PER_BAR))),
      );
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The <audio> element is the source of truth for what is audible; this keeps
  // it in step with the control. Muting sets volume to 0 rather than the muted
  // property so the two cannot disagree about what should be heard.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const bars = useMemo(
    () => resampleBars(realBars ?? placeholderBars, barCount),
    [realBars, placeholderBars, barCount],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWaveform() {
      if (!audioUrl) {
        setRealBars(null);
        return;
      }

      try {
        const peaks = await computeWaveformPeaks(audioUrl);
        if (!cancelled) setRealBars(peaks);
      } catch (err) {
        console.error("Failed to decode waveform:", err);
        if (!cancelled) setRealBars(null);
      }
    }

    void loadWaveform();

    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  useEffect(() => {
    onPositionChange?.(currentSeconds);
  }, [currentSeconds, onPositionChange]);

  // Fake simulated playback — only runs while no real audio is loaded.
  useEffect(() => {
    if (hasRealAudio || !isPlaying) return;

    const interval = setInterval(() => {
      setCurrentSeconds((prev) => {
        if (prev >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasRealAudio, isPlaying, duration]);

  // Ref-only reset (not state) — safe to do directly in an effect.
  useEffect(() => {
    hasRetriedAfterError.current = false;
  }, [audioUrl]);

  // Deferred seek: audioRef can only be touched outside of render.
  useEffect(() => {
    if (seekTarget !== null && audioRef.current) {
      audioRef.current.currentTime = seekTarget;
      setSeekTarget(null);
    }
  }, [seekTarget]);

  function handleTimeUpdate() {
    if (audioRef.current) setCurrentSeconds(audioRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  }

  function handleAudioError() {
    if (!hasRetriedAfterError.current) {
      hasRetriedAfterError.current = true;
      onAudioUrlExpired();
      return;
    }

    setAudioError("Couldn't load audio — try refreshing the page.");
  }

  function togglePlayPause() {
    if (hasRealAudio) {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        void audioRef.current.play();
      }
      return;
    }

    setIsPlaying((prev) => !prev);
    setPendingSeconds(null);
  }

  function seekTo(seconds: number) {
    if (hasRealAudio && audioRef.current) {
      audioRef.current.currentTime = seconds;
    } else {
      setCurrentSeconds(Math.round(seconds));
    }
  }

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = waveformRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const fraction = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / rect.width),
    );
    const seconds = fraction * duration;

    seekTo(seconds);
    setPendingSeconds(isPlaying ? null : Math.round(seconds));
  }

  function jumpToComment(direction: "prev" | "next") {
    if (comments.length === 0) return;

    const sorted = comments
      .map((comment) => comment.timestamp_seconds)
      .sort((a, b) => a - b);

    let target: number;

    if (direction === "next") {
      const next = sorted.find((t) => t > currentSeconds);
      target = next ?? sorted[sorted.length - 1];
    } else {
      const before = sorted.filter((t) => t < currentSeconds);
      target = before.length ? before[before.length - 1] : sorted[0];
    }

    seekTo(target);
    setPendingSeconds(null);
  }

  const progressPercent = (currentSeconds / duration) * 100;
  const pendingPercent =
    pendingSeconds !== null ? (pendingSeconds / duration) * 100 : null;

  // The icon reports what you would actually hear, so silence never looks the
  // same as sound.
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <section className="relative rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
      {hasRealAudio && (
        <audio
          ref={audioRef}
          src={audioUrl!}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={handleAudioError}
        />
      )}

      {/* An icon, not the words "Collapse player" — on a phone the label ate
          a third of the control row for something an ✕ says better. */}
      <button
        onClick={onClose}
        aria-label="Close the player"
        title="Close the player"
        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-neutral-500 transition hover:cursor-pointer hover:bg-neutral-800 hover:text-yellow-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {audioError && <p className="form-error mb-2 pr-8">{audioError}</p>}

      {!hasRealAudio && (
        <p className="mb-2 pr-8 text-xs text-neutral-500">
          No audio yet — open the studio to add some.
        </p>
      )}

      {/*
        The waveform gets its own full-width row rather than being squeezed
        between two timestamps in the control row. On a phone that squeeze left
        it a few centimetres wide and unusable as a scrub target.
      */}
      <div className="relative mt-4 sm:mt-2">
        {pendingSeconds !== null && pendingPercent !== null && (
          <button
            onClick={() => {
              onRequestAddComment(pendingSeconds);
              setPendingSeconds(null);
            }}
            style={{ left: `${pendingPercent}%` }}
            className="absolute -top-9 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-yellow-200 bg-neutral-950 px-2 py-1 text-xs font-semibold text-yellow-100 shadow-lg transition hover:cursor-pointer hover:bg-neutral-800"
          >
            Comment?
          </button>
        )}

        <div
          ref={waveformRef}
          onClick={handleWaveformClick}
          className="relative flex h-14 cursor-pointer items-end overflow-hidden rounded-sm bg-neutral-950 px-1 sm:h-16"
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

        <div className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-2">
          {comments.map((comment) => (
            <button
              key={comment.id}
              onClick={(e) => {
                e.stopPropagation();
                seekTo(comment.timestamp_seconds);
                setPendingSeconds(null);
              }}
              title={`${TICKET_STATUS_STYLES[comment.status].label} ticket at ${formatSongTime(comment.timestamp_seconds)}`}
              style={{
                left: `${(comment.timestamp_seconds / duration) * 100}%`,
              }}
              className={`pointer-events-auto absolute h-2 w-2 -translate-x-1/2 rounded-full ring-1 ring-neutral-950 hover:cursor-pointer ${TICKET_STATUS_STYLES[comment.status].dot}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500">
        <span>{formatSongTime(currentSeconds)}</span>
        <span>{formatSongTime(duration)}</span>
      </div>

      {/*
        Centred under the waveform on a phone, with a real gap between the
        transport group and the way out to the studio, so the two are not one
        undifferentiated row of buttons under the thumb.
      */}
      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => jumpToComment("prev")}
            className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
            aria-label="Jump to previous comment"
            title="Jump to previous comment"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            onClick={togglePlayPause}
            disabled={hasRealAudio && !!audioError}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-black transition hover:cursor-pointer hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5" />
            )}
          </button>

          <button
            onClick={() => jumpToComment("next")}
            className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
            aria-label="Jump to next comment"
            title="Jump to next comment"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setMuted((wasMuted) => !wasMuted)}
              aria-label={muted ? "Unmute" : "Mute"}
              title={muted ? "Unmute" : "Mute"}
              className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
            >
              <VolumeIcon className="h-4 w-4" />
            </button>

            {/* Present on a phone now. It was hidden below sm, which meant the
                one control a listener reaches for most was desktop-only. */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                // Dragging the slider is an unmute in itself -- leaving it
                // muted while the handle sits at two thirds is just silence
                // with no explanation.
                setMuted(false);
              }}
              aria-label="Volume"
              className="h-1 w-20 cursor-pointer accent-yellow-100"
            />
          </div>
        </div>

        <button
          onClick={onOpenStudio}
          title="Stems, versions and the mix"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Open player
        </button>
      </div>
    </section>
  );
}
