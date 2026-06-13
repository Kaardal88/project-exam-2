"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    title: "Project management",
    label: "Your project, your control",
    image: "/preview/project-management.png",
  },
  {
    title: "Track tasks",
    label: "Know who does what",
    image: "/preview/tasks.png",
  },
  {
    title: "Share files",
    label: "Keep everything in one place",
    image: "/preview/files.png",
  },
];

export function PreviewMixer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const activeSlide = slides[activeIndex];

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
    <section className="px-4 pt-4 mt-46 pb-12 bg-amber-400/25 text-yellow-100 md:pt-16 md:pb-24">
      <div className="mx-auto  max-w-7xl">
        <h2 className="mb-8 text-center font-[family-name:var(--font-marker)] text-3xl tracking-wide text-yellow-100 md:text-5xl">
          {activeSlide.label}
        </h2>

        <div className="relative rounded-[2rem] border border-neutral-700 bg-[radial-gradient(circle_at_center,rgba(255,229,150,0.08),transparent_35%),linear-gradient(145deg,#101010,#050505)] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.65)] md:p-8">
          {/* screw placeholders */}
          <div className="absolute left-4 top-4 h-8 w-8 rounded-full border border-yellow-900/60 bg-neutral-950 shadow-inner" />
          <div className="absolute right-4 top-4 h-8 w-8 rounded-full border border-yellow-900/60 bg-neutral-950 shadow-inner" />
          <div className="absolute bottom-4 left-4 h-8 w-8 rounded-full border border-yellow-900/60 bg-neutral-950 shadow-inner" />
          <div className="absolute bottom-4 right-4 h-8 w-8 rounded-full border border-yellow-900/60 bg-neutral-950 shadow-inner" />

          {/* glass screen */}
          <div className="relative mx-auto overflow-hidden rounded-2xl border border-neutral-800 bg-black/70 p-3 shadow-inner md:p-5">
            <div className="pointer-events-none absolute inset-0 z-20 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.08)_35%,transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_60px_rgba(0,0,0,0.9)]" />

            <img
              src={activeSlide.image}
              alt={activeSlide.title}
              className="h-[18rem] w-full rounded-xl object-cover opacity-80 transition duration-500 md:h-[32rem]"
            />

            <div className="absolute bottom-8 left-1/2 z-30 -translate-x-1/2 font-[family-name:var(--font-caveat)] text-3xl text-yellow-100 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] md:text-5xl">
              {activeSlide.title}
            </div>
          </div>

          {/* controls */}
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div className="hidden rounded-xl border border-neutral-800 bg-black/30 p-8 text-center font-[family-name:var(--font-caveat)] text-3xl text-yellow-100 md:block">
              Turn the knob
              <br />
              to explore
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

              <p className="text-sm text-yellow-100/70">
                {paused ? "Paused — click to explore" : "Auto preview running"}
              </p>
            </div>

            <div className="hidden rounded-xl border border-neutral-800 bg-black/30 p-8 text-sm text-yellow-100/80 md:block">
              <p>Hover knob to pause</p>
              <p>Click + / − to browse</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
