"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { StudioStemsMock } from "./mocks/StudioStemsMock";

type MockSlide = {
  id: string;
  /** What this screen is, for the label under the loop. */
  caption: string;
  Component: ComponentType;
};

/**
 * The screens the hero cycles through.
 *
 * One for now. The next one is a picture of the connections between a band,
 * its members and the guests invited onto a project — add it here and the
 * caption, the dots and the crossfade below turn themselves on; nothing else
 * on this page has to change. Both screens share one frame size, so the hero
 * does not resize as they swap.
 *
 * The heights are chosen so that most of the studio's ten lanes are on screen
 * at every width — a list that runs past the bottom edge is fine and reads as
 * scrolled, a list with nothing in it does not. Only lanes may crop: shortening
 * the frame without the mock also shedding chrome is what once left a stems
 * screen showing no stems at all.
 */
const slides: MockSlide[] = [
  {
    id: "studio",
    caption: "Eight stems, one clock, every version kept.",
    Component: StudioStemsMock,
  },
];

const HOLD_MS = 6000;

/**
 * The hero's screen: a panel lying on the page, lit from behind.
 *
 * No bezel and no screws — that is the PreviewMixer's language further down,
 * where the mock is recessed into a desk. Here the screen is the object
 * itself, so the depth has to come from lighting instead:
 *
 * - `rotateY` is **negative**, which brings the right edge toward the viewer
 *   and pushes the left away. The near edge is drawn taller by the
 *   perspective divide, so the panel reads as angled out of the page rather
 *   than merely skewed.
 * - `rotateX` tips the top away, the angle you look at something lying down.
 * - The glow sits behind the whole silhouette and spills past its edges, so
 *   it reads as a backlit panel rather than an outline.
 * - The ground shadow is offset down and to the left, away from the lifted
 *   near edge, which is what makes the panel look lifted at all. It stays out
 *   of the rotation so it lies flat on the page like a shadow does.
 *
 * `isolate` is load-bearing: the glow and the shadow sit at negative z-index,
 * and without a stacking context here they would fall behind the page
 * background and disappear.
 */
export function HeroMockStage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const looping = slides.length > 1;

  useEffect(() => {
    if (!looping || paused) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, HOLD_MS);

    return () => clearInterval(interval);
  }, [looping, paused, activeIndex]);

  const activeSlide = slides[activeIndex];
  const ActiveComponent = activeSlide.Component;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative isolate mx-auto w-full max-w-2xl md:max-w-none"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 bg-[radial-gradient(ellipse_at_60%_45%,rgba(255,229,150,0.22),rgba(255,229,150,0.06)_45%,transparent_72%)] blur-2xl"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-4 -bottom-7 -z-20 h-10 -translate-x-5 rounded-[50%] bg-black/85 blur-xl sm:h-14"
      />

      <div className="[perspective-origin:65%_50%] [perspective:1600px]">
        <div className="relative [transform:rotateY(-15deg)_rotateX(4deg)_rotateZ(-1.2deg)] overflow-hidden rounded-lg border border-neutral-700/80 bg-neutral-950 shadow-[0_45px_80px_-25px_rgba(0,0,0,0.95),0_0_70px_-20px_rgba(255,229,150,0.25)] transition-transform duration-700 ease-out hover:[transform:rotateY(-8deg)_rotateX(2deg)_rotateZ(-0.5deg)]">
          {/* The sheen of a screen catching the light it sits in. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.06)_38%,transparent_58%)]"
          />

          <div
            key={activeSlide.id}
            className="animate-in fade-in h-[20rem] duration-700 sm:h-[25rem] md:h-[27rem] lg:h-[32rem] xl:h-[34rem]"
          >
            <ActiveComponent />
          </div>
        </div>
      </div>

      {looping && (
        <div className="mt-8 flex items-center justify-center gap-3 md:justify-start">
          <div aria-hidden className="flex items-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => setActiveIndex(index)}
                aria-label={slide.caption}
                className={`h-1.5 w-1.5 rounded-full transition hover:cursor-pointer ${
                  index === activeIndex
                    ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]"
                    : "bg-neutral-700"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-neutral-400">{activeSlide.caption}</p>
        </div>
      )}
    </div>
  );
}
