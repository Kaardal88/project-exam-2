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
import { useStemPlayer, type PlayerLane } from "./studio/useStemPlayer";
import type { Version, VersionDetail } from "./studio/types";

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

type Comment = {
  id: string;
  timestamp_seconds: number | null;
  song_version_id: string | null;
  status: TicketStatus;
};

type SeekSignal = { seconds: number; nonce: number };

type MediaPlayerProps = {
  songId: string;
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
  /** the version this card is playing, for deciding which markers apply */
  versionId: string | null;
};

/**
 * The song as one file, on the dashboard.
 *
 * Deliberately the simple half of playback: one mixdown, the comment markers
 * that hang off it, and a way through to the studio. Stems, versions and
 * anything that decides what the song *is* live in the Studio tab, which has
 * the width for it — this card used to open a blurred overlay to make room,
 * and an overlay is a worse workspace than a page.
 *
 * **It has two clocks, and only one is running at a time.** A song with a "Full
 * mix" stem has a single file, and that plays through an <audio> element the
 * way it always did. A song built only from separate stems has no such file —
 * songs.audio_url is null and there is nothing to point the element at — so
 * this card played silence and claimed there was no audio, for exactly the
 * songs the feature exists for. In that case it falls back to the same Web
 * Audio engine the studio uses, on the current version's stems.
 *
 * Nothing decodes until the listener presses play. This is the page you land
 * on, and ten decoded stems is several hundred megabytes to spend on a song
 * somebody may only have opened to read the comments.
 */
export function MediaPlayer({
  songId,
  audioUrl,
  comments,
  onRequestAddComment,
  onPositionChange,
  seekSignal,
  onAudioUrlExpired,
  onOpenStudio,
  onClose,
  versionId,
}: MediaPlayerProps) {
  const hasRealAudio = Boolean(audioUrl);

  /**
   * Which comments belong on this waveform.
   *
   * A comment written about v5 points at a moment in v5, and on a v9 of a
   * different length it would land somewhere it does not mean. So markers are
   * the ones written about this version, plus the version-less ones -- those
   * are about the song whatever is playing, so they are always true.
   *
   * This replaces the old blunt rule of hiding every marker the moment you
   * listened to anything but the current audio, which threw away feedback that
   * was perfectly valid.
   */
  const markers = comments.filter(
    (comment) =>
      comment.timestamp_seconds !== null &&
      (comment.song_version_id === null ||
        comment.song_version_id === versionId),
  );

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

  const [stemLanes, setStemLanes] = useState<PlayerLane[]>([]);
  const [stemsStarted, setStemsStarted] = useState(false);
  const playWhenReady = useRef(false);

  // Only for a song with no single mixdown. A ref rather than state for the
  // "play once decoded" flag, so pressing play does not have to round-trip
  // through a render to take effect.
  useEffect(() => {
    if (audioUrl) return;

    let cancelled = false;

    async function loadCurrentArrangement() {
      const listResponse = await fetch(`/api/songs/${songId}/versions`);
      if (!listResponse.ok) return;

      const versions: Version[] = await listResponse.json();
      const current = versions.find((version) => version.is_current);
      if (!current || cancelled) return;

      const detailResponse = await fetch(
        `/api/songs/${songId}/versions/${current.id}`,
      );
      if (!detailResponse.ok || cancelled) return;

      const detail: VersionDetail = await detailResponse.json();

      setStemLanes(
        detail.stems.map((row) => ({
          id: row.stem.id,
          takeId: row.take.id,
          url: row.url,
        })),
      );
    }

    void loadCurrentArrangement();

    return () => {
      cancelled = true;
    };
  }, [songId, audioUrl]);

  const stems = useStemPlayer(stemLanes, { enabled: stemsStarted });

  /** True when this song is stems and nothing else. */
  const usingStems = !hasRealAudio && stemLanes.length > 0;

  /**
   * The single clock the rest of this component reads, whichever source is
   * driving it. Everything below this line is deliberately unaware of which.
   */
  const position = usingStems ? stems.position : currentSeconds;
  const total = usingStems
    ? stems.duration || PLACEHOLDER_TOTAL_SECONDS
    : duration;
  const playing = usingStems ? stems.isPlaying : isPlaying;


  useEffect(() => {
    if (playWhenReady.current && stems.state === "ready") {
      playWhenReady.current = false;
      void stems.play();
    }
    // Not [stems]: the hook returns a fresh object every render, so depending
    // on it would run this on every one of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stems.state, stems.play]);

  // Adjusting state in response to a prop change (not an effect) — see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // Refs can't be touched during render, so a real-audio seek is deferred to
  // the effect below via `seekTarget` instead of writing audioRef here.
  if (seekSignal && seekSignal.nonce !== appliedSeekNonce) {
    setAppliedSeekNonce(seekSignal.nonce);
    setPendingSeconds(null);

    if (hasRealAudio || usingStems) {
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

  /**
   * One waveform for a song made of several. The loudest lane at each point is
   * what an ear picks out anyway, so the peaks are a per-bar maximum across the
   * stems rather than a sum, which would clip to a solid block.
   */
  const stemBars = useMemo(() => {
    const lanes = Object.values(stems.peaks);
    if (lanes.length === 0) return null;

    const length = Math.max(...lanes.map((lane) => lane.length));

    return Array.from({ length }, (_, i) =>
      Math.max(...lanes.map((lane) => lane[i] ?? 0)),
    );
  }, [stems.peaks]);

  const bars = useMemo(
    () =>
      resampleBars(
        (usingStems ? stemBars : realBars) ?? placeholderBars,
        barCount,
      ),
    [usingStems, stemBars, realBars, placeholderBars, barCount],
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
    onPositionChange?.(position);
  }, [position, onPositionChange]);

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

  // Deferred seek: neither audioRef nor the audio graph can be touched during
  // render, so a seek arriving as a prop is applied here instead.
  useEffect(() => {
    if (seekTarget === null) return;

    // Clearing the one-shot request after applying it. This cannot cascade:
    // the next render has seekTarget null and the effect returns immediately.
    if (usingStems) {
      stems.seek(seekTarget);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeekTarget(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.currentTime = seekTarget;
      setSeekTarget(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTarget, usingStems]);

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
    if (usingStems) {
      // The first press is what buys the decode. Everything after it is an
      // ordinary play/pause against buffers already in memory.
      if (!stemsStarted) {
        setStemsStarted(true);
        playWhenReady.current = true;
        return;
      }

      stems.toggle();
      return;
    }

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
    if (usingStems) {
      stems.seek(seconds);
      return;
    }

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
    const seconds = fraction * total;

    seekTo(seconds);
    setPendingSeconds(playing ? null : Math.round(seconds));
  }

  function jumpToComment(direction: "prev" | "next") {
    if (markers.length === 0) return;

    const sorted = markers
      .map((comment) => comment.timestamp_seconds!)
      .sort((a, b) => a - b);

    let target: number;

    if (direction === "next") {
      const next = sorted.find((t) => t > position);
      target = next ?? sorted[sorted.length - 1];
    } else {
      const before = sorted.filter((t) => t < position);
      target = before.length ? before[before.length - 1] : sorted[0];
    }

    seekTo(target);
    setPendingSeconds(null);
  }

  const progressPercent = (position / total) * 100;
  const pendingPercent =
    pendingSeconds !== null ? (pendingSeconds / total) * 100 : null;

  // The icon reports what you would actually hear, so silence never looks the
  // same as sound.
  const heardVolume = usingStems ? stems.masterVolume : muted ? 0 : volume;

  const VolumeIcon =
    heardVolume === 0 ? VolumeX : heardVolume < 0.5 ? Volume1 : Volume2;

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

      {usingStems ? (
        <p className="mb-2 pr-8 text-xs text-neutral-500">
          {stems.state === "loading"
            ? `Loading ${stems.loadedCount} of ${stems.laneCount} stems…`
            : `Built from ${stemLanes.length} stems, played together.`}
        </p>
      ) : (
        !hasRealAudio && (
          <p className="mb-2 pr-8 text-xs text-neutral-500">
            No audio yet — open the studio to add some.
          </p>
        )
      )}

      {usingStems && stems.error && (
        <p className="form-error mb-2 pr-8">{stems.error}</p>
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
          {markers.map((comment) => (
            <button
              key={comment.id}
              onClick={(e) => {
                e.stopPropagation();
                seekTo(comment.timestamp_seconds!);
                setPendingSeconds(null);
              }}
              title={`${TICKET_STATUS_STYLES[comment.status].label} ticket at ${formatSongTime(comment.timestamp_seconds!)}`}
              style={{
                left: `${(comment.timestamp_seconds! / total) * 100}%`,
              }}
              className={`pointer-events-auto absolute h-2 w-2 -translate-x-1/2 rounded-full ring-1 ring-neutral-950 hover:cursor-pointer ${TICKET_STATUS_STYLES[comment.status].dot}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500">
        <span>{formatSongTime(position)}</span>
        <span>{formatSongTime(total)}</span>
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
            disabled={
              (hasRealAudio && !!audioError) ||
              (usingStems && stems.state === "loading")
            }
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-black transition hover:cursor-pointer hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
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
              onClick={() => {
                // The stems run through their own gain chain, which the
                // <audio> element's volume never reaches.
                if (usingStems) {
                  stems.setMasterVolume(stems.masterVolume > 0 ? 0 : 1);
                }
                setMuted((wasMuted) => !wasMuted);
              }}
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
              value={usingStems ? stems.masterVolume : muted ? 0 : volume}
              onChange={(e) => {
                if (usingStems) stems.setMasterVolume(Number(e.target.value));
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
