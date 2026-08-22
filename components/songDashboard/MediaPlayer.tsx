"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  Upload,
} from "lucide-react";
import { formatSongTime } from "@/lib/utils";
import { uploadToR2 } from "@/lib/uploadToR2";
import { TICKET_STATUS_STYLES, type TicketStatus } from "./ticketStatus";
import { UploadProgress } from "./UploadProgress";

// Placeholder duration used until real audio is uploaded/loaded.
const PLACEHOLDER_TOTAL_SECONDS = 246;
const MP3_MAX_BYTES = 25 * 1024 * 1024;

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const waveformRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  async function handleUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploadError(null);

    if (!file.name.toLowerCase().endsWith(".mp3") || file.type !== "audio/mpeg") {
      setUploadError("Only .mp3 files are allowed");
      return;
    }

    if (file.size > MP3_MAX_BYTES) {
      setUploadError("File too large. Max 25MB");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadSuccess(false);

    try {
      const { key } = await uploadToR2({
        songId,
        target: "audio",
        file,
        onProgress: setUploadProgress,
      });

      const response = await fetch(`/api/songs/${songId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audio_url: key }),
      });

      if (!response.ok) {
        throw new Error("Failed to save audio to song");
      }

      onAudioUploaded();
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }

  const progressPercent = (currentSeconds / duration) * 100;
  const pendingPercent =
    pendingSeconds !== null ? (pendingSeconds / duration) * 100 : null;

  return (
    <section className="rounded-md border border-neutral-700 bg-neutral-900/80 p-4 shadow-2xl">
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

      {audioError && <p className="form-error mb-2">{audioError}</p>}
      {uploadError && <p className="form-error mb-2">{uploadError}</p>}

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
            className="relative flex h-10 cursor-pointer items-end overflow-hidden rounded-sm bg-neutral-950 px-1"
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

        <Volume2
          className="h-4 w-4 shrink-0 text-neutral-500"
          aria-hidden="true"
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,.mp3"
          onChange={handleUploadFile}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={hasRealAudio ? "Replace audio (MP3, max 25MB)" : "Upload audio (MP3, max 25MB)"}
          className="hidden shrink-0 items-center gap-1.5 rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:cursor-pointer hover:border-yellow-200 hover:text-yellow-100 disabled:cursor-not-allowed sm:flex"
        >
          <UploadProgress progress={uploadProgress} success={uploadSuccess} />
          {uploadProgress === null && !uploadSuccess && (
            <>
              <Upload className="h-3 w-3" />
              {hasRealAudio ? "Replace" : "Upload MP3"}
            </>
          )}
        </button>

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
