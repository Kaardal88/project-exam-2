"use client";

import { useEffect, useRef, useState } from "react";
import { resampleBars } from "@/lib/waveform";

const PIXELS_PER_BAR = 3;
const MIN_BARS = 40;

type StemWaveformProps = {
  peaks: number[] | undefined;
  /** 0–1, how much of the lane has played */
  progress: number;
  /** the stem's colour, used for the played portion */
  color: string;
  dimmed?: boolean;
  height?: number;
  onSeekFraction?: (fraction: number) => void;
};

/**
 * One lane's waveform, on a canvas rather than as DOM nodes.
 *
 * The single-file player draws its bars as spans, which is fine for one
 * waveform. Twelve lanes at a few hundred bars each is several thousand
 * elements being restyled on every animation frame, so the studio paints
 * instead.
 *
 * The stem's colour is used for the played portion only, never for text: a
 * band is free to pick a near-black, and a lane that becomes unreadable
 * because of its own colour is a worse outcome than one that is merely dark.
 */
export function StemWaveform({
  peaks,
  progress,
  color,
  dimmed = false,
  height = 48,
  onSeekFraction,
}: StemWaveformProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setWidth(Math.round(measured));
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Drawn at device resolution, so the waveform is not soft on a phone or a
    // retina display.
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const barCount = Math.max(MIN_BARS, Math.floor(width / PIXELS_PER_BAR));
    const bars = resampleBars(peaks ?? [], barCount);

    if (bars.length === 0) return;

    const barWidth = width / bars.length;
    const playedUpTo = progress * width;

    bars.forEach((peak, index) => {
      const x = index * barWidth;
      const barHeight = Math.max(1, (peak / 100) * height);
      const y = (height - barHeight) / 2;

      const played = x + barWidth / 2 <= playedUpTo;

      context.globalAlpha = dimmed ? 0.25 : played ? 1 : 0.35;
      context.fillStyle = played ? color : "#737373";
      context.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
    });

    context.globalAlpha = 1;
  }, [peaks, progress, color, dimmed, width, height]);

  return (
    <div
      ref={wrapperRef}
      onClick={(event) => {
        if (!onSeekFraction) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onSeekFraction(
          Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
        );
      }}
      className={`relative w-full overflow-hidden rounded-sm bg-neutral-950 ${
        onSeekFraction ? "cursor-pointer" : ""
      }`}
      style={{ height }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {peaks === undefined && (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] uppercase tracking-widest text-neutral-600">
          decoding…
        </span>
      )}
    </div>
  );
}
