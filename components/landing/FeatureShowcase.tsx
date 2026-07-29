"use client";

import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { CheckSquare, FileText, StickyNote, Music } from "lucide-react";

type Feature = {
  icon: ComponentType<{ className?: string }>;
  heading: string;
  description: string;
  visual: ReactNode;
};

const features: Feature[] = [
  {
    icon: CheckSquare,
    heading: "Tasks, with an owner",
    description:
      "Every to-do gets an assignee and a due date, so nothing falls through the cracks.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-3.5 w-3.5 rounded border border-neutral-600" />
          <span className="flex-1 truncate text-neutral-200">
            Master the drum bus
          </span>
          <span className="text-xs text-neutral-400">eirikstorm</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="h-3.5 w-3.5 rounded border border-yellow-100 bg-yellow-100/80" />
          <span className="flex-1 truncate text-neutral-500 line-through">
            Book rehearsal room
          </span>
          <span className="text-xs text-neutral-400">majalind</span>
        </div>
      </div>
    ),
  },
  {
    icon: FileText,
    heading: "Documents, in one place",
    description:
      "Contracts, riders and press photos — shared with the band instead of buried in a group chat.",
    visual: (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="flex-1 truncate text-neutral-200">
            rider_nattkjoring_2026.pdf
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
          <span className="flex-1 truncate text-neutral-200">
            press-photo-01.jpg
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: StickyNote,
    heading: "Notes & ideas",
    description:
      "Drop a lyric idea or a mix note the moment it hits — searchable, never lost in a voice memo.",
    visual: (
      <div className="rounded-md border border-neutral-700 bg-neutral-950 p-3 text-sm">
        <p className="font-semibold text-yellow-100">Chorus idea</p>
        <p className="mt-1 line-clamp-2 text-neutral-300">
          Try stacking the harmony an octave up on the last chorus.
        </p>
      </div>
    ),
  },
  {
    icon: Music,
    heading: "Audio, uploaded and ready",
    description:
      "Drag in a rough mix or a stem — the band hears it and can comment on the exact timestamp.",
    visual: (
      <div className="rounded-md border border-neutral-700 bg-neutral-950 p-3">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span>skumring_v3.wav</span>
          <span>72%</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full w-[72%] rounded-full bg-amber-300" />
        </div>
      </div>
    ),
  },
];

export function FeatureShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % features.length);
    }, 3000);

    return () => clearInterval(interval);
    // Re-armed on activeIndex too, so a manual prev/next click restarts the
    // 3s countdown instead of auto-advancing again a moment later.
  }, [paused, activeIndex]);

  const activeFeature = features[activeIndex];
  const Icon = activeFeature.icon;

  function nextFeature() {
    setActiveIndex((current) => (current + 1) % features.length);
  }

  function previousFeature() {
    setActiveIndex((current) =>
      current === 0 ? features.length - 1 : current - 1,
    );
  }

  return (
    <section
      id="features"
      className="scroll-mt-20 px-4 pb-16 text-yellow-100 md:pb-24"
    >
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-8 text-center font-[family-name:var(--font-marker)] text-2xl tracking-wide text-yellow-100 md:text-4xl">
          Everything the band needs
        </h2>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] md:p-8"
        >
          <div
            key={activeIndex}
            className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-500 sm:flex-row sm:items-start"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-black/40">
              <Icon className="h-5 w-5 text-yellow-100" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-yellow-100 md:text-lg">
                {activeFeature.heading}
              </h3>
              <p className="mt-1 text-sm text-neutral-400">
                {activeFeature.description}
              </p>
              <div className="mt-4">{activeFeature.visual}</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              onClick={previousFeature}
              className="text-xl text-yellow-100/70 transition hover:scale-110 hover:text-yellow-100"
              aria-label="Previous feature"
            >
              ‹
            </button>

            <div aria-hidden className="flex items-center gap-2">
              {features.map((feature, index) => (
                <span
                  key={feature.heading}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    index === activeIndex
                      ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]"
                      : "bg-neutral-700"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextFeature}
              className="text-xl text-yellow-100/70 transition hover:scale-110 hover:text-yellow-100"
              aria-label="Next feature"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
