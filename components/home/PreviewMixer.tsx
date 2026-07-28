"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { MockGlassFrame } from "@/components/landing/mocks/MockGlassFrame";
import { UserProfileMock } from "@/components/landing/mocks/UserProfileMock";
import { BandProfileMock } from "@/components/landing/mocks/BandProfileMock";
import { SongDashboardMock } from "@/components/landing/mocks/SongDashboardMock";

const slides: { title: string; label: string; Component: ComponentType }[] = [
  {
    title: "Band profiles",
    label: "Your band's home base",
    Component: BandProfileMock,
  },
  {
    title: "Song dashboard",
    label: "The heart of every project",
    Component: SongDashboardMock,
  },
  {
    title: "Your artist profile",
    label: "One profile, every band",
    Component: UserProfileMock,
  },
];

export function PreviewMixer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const activeSlide = slides[activeIndex];
  const ActiveComponent = activeSlide.Component;

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [paused]);

  function nextSlide() {
    setActiveIndex((current) => (current + 1) % slides.length);
  }

  function previousSlide() {
    setActiveIndex((current) =>
      current === 0 ? slides.length - 1 : current - 1,
    );
  }

  return (
    <section
      id="preview"
      className="scroll-mt-20 px-4 pt-4 mt-46 pb-12 text-yellow-100 md:pt-16 md:pb-24"
    >
      <div className="mx-auto  max-w-7xl">
        <h2 className="mb-8 text-center font-[family-name:var(--font-marker)] text-3xl tracking-wide text-yellow-100 md:text-5xl">
          {activeSlide.label}
        </h2>

        {/* The "desk" the mixer screen and controls sit recessed into —
            reuses the exact brown/gold stops from the knob gradient and
            the existing .app-preview wood-frame brown (#2a241b), so it
            reads as the same material family instead of a new palette.
            Narrower than the section so the page's own background shows
            on either side, instead of a full-bleed tint. No hard drawn
            border — the material reads through the gradient + grain
            instead of a graphic-design rectangle. */}
        <div className="relative mx-auto max-w-6xl [perspective:1400px]">
          <div className="relative overflow-hidden rounded-t-[2.5rem] rounded-b-xl bg-[linear-gradient(135deg,#1a1208_0%,#2a241b_30%,#1a1208_55%,#2a241b_80%,#1a1208_100%)] p-10 shadow-[0_25px_70px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] [transform-style:preserve-3d] md:origin-top md:p-16 md:[transform:rotateX(7deg)]">
            {/* warm top light, matching the glass frame's own highlight */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,229,150,0.10),transparent_55%)]" />

            {/* organic wood-grain texture — an inline SVG fractal-noise
                filter blended over the gradient, no new dependency or
                image asset needed for this. */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full opacity-25 mix-blend-overlay"
            >
              <filter id="preview-mixer-wood-grain">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.012 0.9"
                  numOctaves={4}
                  seed={15}
                />
                <feColorMatrix type="saturate" values="0" />
              </filter>
              <rect width="100%" height="100%" filter="url(#preview-mixer-wood-grain)" />
            </svg>

            {/* a scratch in the wood */}
            <div className="pointer-events-none absolute left-[14%] top-[22%] h-px w-28 -rotate-6 bg-gradient-to-r from-transparent via-black/50 to-transparent md:w-40" />
            <div className="pointer-events-none absolute left-[14%] top-[calc(22%+1px)] h-px w-28 -rotate-6 bg-gradient-to-r from-transparent via-white/10 to-transparent md:w-40" />

            <MockGlassFrame>
              <h3 className="sr-only">{activeSlide.title}</h3>
              <ActiveComponent />
            </MockGlassFrame>

            {/* controls */}
            <div className="relative mt-8 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-8">
            <div className="hidden rounded-xl border border-neutral-800 bg-black/30 p-6 text-center md:flex md:flex-col md:items-center md:justify-center md:gap-2 md:p-8">
              <p className="font-[family-name:var(--font-caveat)] text-2xl text-yellow-100">
                Turn the knob to explore
              </p>
              <p className="text-sm text-yellow-100/60">
                Hover to pause · click + / − to browse
              </p>
            </div>

            <div
              className="mx-auto flex flex-col items-center gap-3"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="flex items-center gap-6">
                <button
                  onClick={previousSlide}
                  className="text-3xl text-yellow-100 transition hover:scale-110 hover:text-yellow-200"
                  aria-label="Previous preview"
                >
                  −
                </button>

                <button
                  onClick={nextSlide}
                  className="relative h-28 w-28 rounded-full border border-yellow-900/80 bg-[radial-gradient(circle_at_35%_35%,#f9dc8a,#8a5f24_45%,#1a1208_75%)] shadow-[0_12px_30px_rgba(0,0,0,0.7),inset_0_0_18px_rgba(255,255,255,0.25)] transition hover:scale-105"
                  style={{
                    transform: `rotate(${activeIndex * 55}deg)`,
                  }}
                  aria-label="Turn preview knob"
                >
                  <span className="absolute left-1/2 top-4 h-8 w-1 -translate-x-1/2 rounded-full bg-yellow-100/80" />
                </button>

                <button
                  onClick={nextSlide}
                  className="text-3xl text-yellow-100 transition hover:scale-110 hover:text-yellow-200"
                  aria-label="Next preview"
                >
                  +
                </button>
              </div>

              {/* LED position indicators */}
              <div aria-hidden className="flex items-center gap-2">
                {slides.map((slide, index) => (
                  <span
                    key={slide.title}
                    className={`h-1.5 w-1.5 rounded-full transition ${
                      index === activeIndex
                        ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]"
                        : "bg-neutral-700"
                    }`}
                  />
                ))}
              </div>

              <p className="text-sm text-yellow-100/70">
                {paused ? "Paused — click to explore" : "Auto preview running"}
              </p>
            </div>

            {/* Fader concept preview — static mockup only, no wiring yet */}
            <div className="hidden flex-col items-center gap-6 rounded-xl border border-neutral-800 bg-black/30 p-6 md:flex md:p-8">
              {/* square analog power button */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  aria-pressed="true"
                  className="relative h-10 w-10 rounded-md border border-black/60 bg-gradient-to-b from-neutral-700 to-neutral-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_3px_6px_rgba(0,0,0,0.6)]"
                >
                  <span className="absolute inset-1.5 rounded-sm bg-green-400 shadow-[0_0_10px_3px_rgba(74,222,128,0.85)]" />
                </button>
                <span className="text-[10px] font-semibold tracking-widest text-yellow-100/60">
                  ON
                </span>
              </div>

              {/* fader recessed in its own housing, not a bare floating bar */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex w-36 justify-between px-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="h-1.5 w-px bg-yellow-100/20" />
                  ))}
                </div>
                <div className="relative w-36 rounded-full border border-black/60 bg-black/50 p-1.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.04)]">
                  <div className="relative h-1.5 w-full rounded-full bg-neutral-900">
                    <div className="absolute inset-y-0 left-0 w-3/5 rounded-full bg-gradient-to-r from-[#8a5f24] to-[#f9dc8a]" />
                  </div>
                  <div className="absolute -top-1 left-[58%] h-5 w-3.5 -translate-x-1/2 rounded-sm border border-yellow-900/80 bg-[radial-gradient(circle_at_35%_35%,#f9dc8a,#8a5f24_45%,#1a1208_75%)] shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* table front edge, glimpsed below the desk for a 3D
              "looking down at it" feel */}
          <div className="mx-4 h-6 rounded-b-2xl bg-[linear-gradient(to_bottom,#241a10_0%,#0d0904_100%)] shadow-[inset_0_1px_0_rgba(255,229,150,0.10),0_16px_28px_rgba(0,0,0,0.55)] md:h-10" />
        </div>
      </div>
    </section>
  );
}
