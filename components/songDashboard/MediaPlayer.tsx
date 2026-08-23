"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { formatSongTime } from "@/lib/utils";
import { TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";
import { AudioVersions, type AudioVersion } from "./AudioVersions";

// Placeholder duration used until real audio is uploaded/loaded.
const PLACEHOLDER_TOTAL_SECONDS = 246;

// Decoded/placeholder data is generated at this resolution so the display
// can always downsample to however many bars actually fit on screen,
// instead of being locked to a fixed, screen-independent bar count.
const RAW_PEAK_COUNT = 400;
const MIN_BARS = 60;
const MAX_BARS = RAW_PEAK_COUNT;
const PIXELS_PER_BAR = 3;

// Resamples a peak array to a different resolution by taking the max per
// bucket — works for both downsampling (the common case) and upsampling.
function resampleBars(source: number[], targetCount: number): number[] {
  if (source.length === 0) return [];
  if (source.length === targetCount) return source;

  const bucketSize = source.length / targetCount;

  return Array.from({ length: targetCount }, (_, i) => {
    const start = Math.floor(i * bucketSize);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucketSize));

    let max = 0;
    for (let j = start; j < end && j < source.length; j++) {
      if (source[j] > max) max = source[j];
    }

    return max;
  });
}

// Decodes the audio into peak amplitudes, at RAW_PEAK_COUNT resolution.
async function computeWaveformPeaks(audioUrl: string): Promise<number[]> {
  // no-store: the <audio> element already fetched this same URL in
  // no-cors mode for playback, so a cached/revalidated (304) response
  // here would carry no CORS headers and fail the cors-mode fetch below.
  const response = await fetch(audioUrl, { cache: "no-store" });
  const arrayBuffer = await response.arrayBuffer();

  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPeak = Math.max(
      1,
      Math.floor(channelData.length / RAW_PEAK_COUNT),
    );

    const peaks = Array.from({ length: RAW_PEAK_COUNT }, (_, i) => {
      const start = i * samplesPerPeak;
      const end = Math.min(start + samplesPerPeak, channelData.length);

      let max = 0;
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }

      return max;
    });

    const maxPeak = Math.max(...peaks, 0.0001);

    return peaks.map((peak) => 20 + (peak / maxPeak) * 80);
  } finally {
    void audioContext.close();
  }
}

type Comment = { id: string; timestamp_seconds: number; status: TicketStatus };

type SeekSignal = { seconds: number; nonce: number };

type MediaPlayerProps = {
  songId: string;
  audioUrl: string | null;
  comments: Comment[];
  onRequestAddComment: (timestampSeconds: number) => void;
  onPositionChange?: (seconds: number) => void;
  seekSignal?: SeekSignal | null;
  onAudioUploaded: () => void;
  onAudioUrlExpired: () => void;
  isLeader: boolean;
  currentUserId: string | null;
};

export function MediaPlayer({
  songId,
  audioUrl,
  comments,
  onRequestAddComment,
  onPositionChange,
  seekSignal,
  onAudioUploaded,
  onAudioUrlExpired,
  isLeader,
  currentUserId,
}: MediaPlayerProps) {
  const [previewVersion, setPreviewVersion] = useState<AudioVersion | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Previewing an older take swaps what the player is pointed at without
  // touching what the song actually is. Everything below works off this rather
  // than the prop, so seeking, the waveform and the duration all follow.
  const activeAudioUrl = previewUrl ?? audioUrl;
  const hasRealAudio = Boolean(activeAudioUrl);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState(PLACEHOLDER_TOTAL_SECONDS);
  const [pendingSeconds, setPendingSeconds] = useState<number | null>(null);
  const [appliedSeekNonce, setAppliedSeekNonce] = useState(seekSignal?.nonce);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [appliedAudioUrl, setAppliedAudioUrl] = useState(activeAudioUrl);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const [versions, setVersions] = useState<AudioVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);

  const waveformRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hasRetriedAfterError = useRef(false);

  // Loaded whether or not the player is expanded: the collapsed card names the
  // take it is playing, and it cannot do that from a list that only exists
  // inside the panel.
  const loadVersions = useCallback(async () => {
    const response = await fetch(`/api/songs/${songId}/versions`);

    if (response.ok) setVersions(await response.json());

    setVersionsLoading(false);
  }, [songId]);

  useEffect(() => {
    async function load() {
      await loadVersions();
    }

    void load();
  }, [loadVersions]);

  const currentVersion = versions.find((version) => version.is_current) ?? null;

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

  if (hasRealAudio && activeAudioUrl !== appliedAudioUrl) {
    setAppliedAudioUrl(activeAudioUrl);
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

  // `expanded` is a dependency because collapsing and expanding swap the
  // waveform for a different DOM node. Without it the observer would still be
  // watching the node that was just thrown away, and the expanded player would
  // draw mobile-width detail across its full width.
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
  }, [expanded]);

  // The <audio> element is the source of truth for what is audible; this keeps
  // it in step with the control. Muting sets volume to 0 rather than the muted
  // property so the two cannot disagree about what should be heard.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Escape closes the expanded player, the way it closes every modal.
  useEffect(() => {
    if (!expanded) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setExpanded(false);
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [expanded]);

  const bars = useMemo(
    () => resampleBars(realBars ?? placeholderBars, barCount),
    [realBars, placeholderBars, barCount],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadWaveform() {
      if (!activeAudioUrl) {
        setRealBars(null);
        return;
      }

      try {
        const peaks = await computeWaveformPeaks(activeAudioUrl);
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
  }, [activeAudioUrl]);

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
  }, [activeAudioUrl]);

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

  function secondsFromClientX(clientX: number) {
    const el = waveformRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return fraction * duration;
  }

  function handleWaveformClick(e: React.MouseEvent<HTMLDivElement>) {
    const seconds = secondsFromClientX(e.clientX);
    if (seconds === null) return;

    if (hasRealAudio && audioRef.current) {
      audioRef.current.currentTime = seconds;
    } else {
      setCurrentSeconds(Math.round(seconds));
    }

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

    if (hasRealAudio && audioRef.current) {
      audioRef.current.currentTime = target;
    } else {
      setCurrentSeconds(target);
    }

    setPendingSeconds(null);
  }

  /**
   * Switch what the player is pointed at, without touching what the song is.
   *
   * Passing null returns to the current version. The signed URL is fetched per
   * version rather than held for all of them, because they expire and a list
   * of stale URLs is worse than no list.
   */
  async function handlePreview(version: AudioVersion | null) {
    if (!version) {
      setPreviewVersion(null);
      setPreviewUrl(null);
      return;
    }

    const response = await fetch(
      `/api/songs/${songId}/versions/${version.id}/url`,
    );

    if (!response.ok) {
      setAudioError("Couldn't load that version.");
      return;
    }

    setPreviewVersion(version);
    setPreviewUrl((await response.json()).url);
  }

  const progressPercent = (currentSeconds / duration) * 100;
  const pendingPercent =
    pendingSeconds !== null ? (pendingSeconds / duration) * 100 : null;

  // The icon reports what you would actually hear, so silence never looks the
  // same as sound.
  const VolumeIcon =
    muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  const controls = (
    <>
      {audioError && <p className="form-error mb-2">{audioError}</p>}

      {/*
        Shown in both the collapsed and expanded player. Collapsing does not
        stop a preview, so without this the card would quietly be playing a
        take that is not the song, with the comment markers gone and nothing
        saying why.
      */}
      {previewVersion ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-yellow-200/30 bg-yellow-100/5 px-3 py-2">
          <span className="text-xs text-neutral-300">
            Listening to{" "}
            <span className="font-semibold text-yellow-100">
              {previewVersion.label}
            </span>
            {" — not the song's current audio."}
          </span>

          <button
            onClick={() => handlePreview(null)}
            className="rounded-md border border-neutral-700 px-2 py-0.5 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100"
          >
            Back to current
          </button>
        </div>
      ) : (
        currentVersion && (
          <p className="mb-2 text-xs text-neutral-500">
            Playing{" "}
            <span className="font-semibold text-neutral-300">
              {currentVersion.label}
            </span>
          </p>
        )
      )}

      <div className="flex items-center gap-3 sm:gap-4">
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
            className={`relative flex cursor-pointer items-end overflow-hidden rounded-sm bg-neutral-950 px-1 ${
              expanded ? "h-40" : "h-10"
            }`}
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

          {/*
            Comments are timestamped against the song, not against a take. On
            an older version of a different length they would point at the
            wrong moments, so they are hidden rather than shown misplaced.
          */}
          <div
            className={`pointer-events-none absolute inset-x-0 -bottom-2 h-2 ${
              previewVersion ? "hidden" : ""
            }`}
          >
            {comments.map((comment) => (
              <button
                key={comment.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasRealAudio && audioRef.current) {
                    audioRef.current.currentTime = comment.timestamp_seconds;
                  } else {
                    setCurrentSeconds(comment.timestamp_seconds);
                  }
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

        <span className="w-10 shrink-0 text-xs text-neutral-400">
          {formatSongTime(duration)}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setMuted((wasMuted) => !wasMuted)}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Unmute" : "Mute"}
            className="shrink-0 text-neutral-400 transition hover:cursor-pointer hover:text-yellow-100"
          >
            <VolumeIcon className="h-4 w-4" />
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              // Dragging the slider is an unmute in itself -- leaving it muted
              // while the handle sits at two thirds is just silence with no
              // explanation.
              setMuted(false);
            }}
            aria-label="Volume"
            className={`h-1 cursor-pointer accent-yellow-100 ${
              expanded ? "w-28" : "hidden w-20 sm:block"
            }`}
          />
        </div>

        {/*
          Uploading lives in the version panel now, so there is one way for
          audio to enter a song rather than two that write different things.
          With no audio at all there is nothing to expand into, so the button
          says what it would get you.
        */}
        <button
          onClick={() => setExpanded((wasExpanded) => !wasExpanded)}
          title={expanded ? "Collapse player" : "Expand player"}
          className="hidden shrink-0 items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 sm:flex"
        >
          {expanded ? "Collapse" : hasRealAudio ? "Expand player" : "Add audio"}
          {expanded ? (
            <Minimize2 className="h-3 w-3" />
          ) : (
            <Maximize2 className="h-3 w-3" />
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/*
        Kept outside the collapsed/expanded branch on purpose. React reconciles
        by position, so moving this element into the overlay would unmount and
        remount it -- which stops playback and drops the playhead back to zero.
        Sitting here, it never moves, and expanding is silent to the listener.
      */}
      {hasRealAudio && (
        <audio
          ref={audioRef}
          src={activeAudioUrl!}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={handleAudioError}
        />
      )}

      {expanded ? (
        // Bounded by the dashboard column rather than the viewport: the column
        // is the positioned ancestor, so the blur stops where the dashboard
        // stops and the sidebar stays legible beside it.
        <div className="absolute inset-0 z-40">
          <button
            onClick={() => setExpanded(false)}
            aria-label="Close expanded player"
            className="absolute inset-0 h-full w-full cursor-default bg-neutral-950/70 backdrop-blur-sm"
          />

          {/*
            A viewport-tall sticky layer, centring its content. The dashboard
            column is min-h-screen and usually much taller than the window, so
            centring inside the column would park the player halfway down the
            page and out of sight. Measuring against the window instead keeps
            it in the middle of what you are actually looking at, however far
            down the dashboard you had scrolled when you expanded it.
          */}
          <div className="sticky top-0 z-10 flex h-screen items-center justify-center px-4">
            <section className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900/95 p-6 shadow-2xl">
              {controls}

              <AudioVersions
                songId={songId}
                isLeader={isLeader}
                currentUserId={currentUserId}
                versions={versions}
                loading={versionsLoading}
                onReload={loadVersions}
                previewVersionId={previewVersion?.id ?? null}
                onPreview={handlePreview}
                onPromoted={onAudioUploaded}
              />
            </section>
          </div>
        </div>
      ) : (
        <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
          {controls}
        </section>
      )}
    </>
  );
}
