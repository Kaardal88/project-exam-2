"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PreviewMixer } from "@/components/home/PreviewMixer";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroMockStage } from "@/components/landing/HeroMockStage";
import { appName } from "@/components/Stemlock";

type Band = {
  id: string;
  slug: string;
  band_name: string;
  bio?: string;
  image_url?: string | null;
};

export default function HomePage() {
  const [featuredBands, setFeaturedBands] = useState<Band[]>([]);
  const [bandCount, setBandCount] = useState(0);

  useEffect(() => {
    async function loadBands() {
      // Four random bands and the size of the catalogue, in one request. This
      // used to download every public band in order to shuffle four of them
      // and count the rest; the directory does both server-side now --
      // `sort=random` is `ORDER BY random()`, and `total` counts the whole
      // filtered set rather than what came back.
      const response = await fetch("/api/bands/public?sort=random&limit=4");
      const data = await response.json();

      if (response.ok) {
        setFeaturedBands(data.bands ?? []);
        setBandCount(data.total ?? 0);
      }
    }

    loadBands();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,229,150,0.10),transparent_28%),linear-gradient(to_bottom,#0a0a0a,#171717)] text-yellow-100">
      <LandingNav />

      {/*Hero section — two columns from md up: the pitch on the left,
         a look at the song dashboard on the right. Log in and Sign up
         used to live under the text and now sit in LandingNav, so this
         column carries the two calls to action instead: start an account,
         or read on. */}
      <div
        id="home"
        className="mx-auto grid max-w-7xl scroll-mt-20 items-center gap-10 px-6 pt-24 pb-12 sm:pt-28 md:min-h-screen md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-14 md:py-20 lg:gap-20"
      >
        {/* extra top padding above clears the fixed LandingNav, which
            otherwise sits directly on top of the wordmark on mobile */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <div
            className="
        flex items-center justify-center
        bg-[#f3e7b6] text-neutral-950
        px-8 py-4
        font-[family-name:var(--font-marker)]
         font-black tracking-tight
        shadow-[0_8px_25px_rgba(0,0,0,0.45)]
        -rotate-2 text-3xl
        sm:px-12 sm:py-5 sm:text-4xl
        md:px-10 md:py-6 md:text-4xl lg:px-14 lg:text-6xl
        [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]
      "
          >
            {appName}
          </div>

          <section className="flex flex-col items-center gap-4 pt-10 md:items-start md:gap-5">
            <h3 className="max-w-xl text-2xl  font-[family-name:var(--font-caveat)]  leading-snug text-[#e6d98d] md:text-3xl lg:text-4xl">
              Stack your songs and stems. From first demo to final mix.
            </h3>
            <p className="max-w-xl font-[family-name:var(--font-caveat)] text-1xl leading-relaxed text-[#e6d98d] md:text-2xl lg:text-2xl">
              One place for every song, stem, version, comment and collaborator.
              <br />
              <br />
              StemLock keeps your music organized as it grows — so everyone
              knows what’s current, what changed, and what comes next.
            </p>

            <div className="mt-4 flex w-full max-w-xs items-center justify-center gap-3 sm:max-w-none sm:gap-4 md:justify-start">
              <Link
                href="/register"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#4b432d] bg-yellow-100 px-4 py-2 text-sm font-bold !text-black transition duration-300 ease-in-out hover:-translate-y-1 hover:scale-105 hover:bg-yellow-200 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base"
              >
                Get started
              </Link>

              <a
                href="#features"
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#4b432d] bg-neutral-900 px-4 py-2 text-sm font-semibold text-[#f5f0d8] transition hover:bg-neutral-800 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base"
              >
                How it works
              </a>
            </div>
          </section>
        </div>

        {/* Extra bottom room on mobile: the stage's shadow and glow sit
            outside its box, and would otherwise crowd the section below. */}
        <div className="w-full pb-10 md:pb-0">
          <HeroMockStage />
        </div>
      </div>
      <h1 className=" font-[family-name:var(--font-marker)] text-2xl uppercase tracking-wide md:text-4xl lg:text-5xl mx-auto mt-20 text-center text-yellow-100">
        Make music! Not mess!
      </h1>

      <PreviewMixer />

      <FeatureShowcase />

      <section id="bands" className="bands-section mt-24! mb-24! scroll-mt-20">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-100 font-[family-name:var(--font-caveat)]">
          Bands on the stage
        </h2>

        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          <div className="grid w-full max-w-6xl grid-cols-2 gap-3 rounded-md border border-neutral-700 bg-neutral-900/80 p-3 sm:grid-cols-3 sm:gap-4 sm:p-5 md:grid-cols-4 lg:grid-cols-4">
            {featuredBands.map((band) => (
              <Link
                key={band.id}
                href={`/band/${band.slug ?? band.id}`}
                className="flex flex-col items-center rounded-md border border-neutral-700 p-3 text-center shadow-xl sm:p-5"
              >
                {band.image_url ? (
                  <img
                    src={band.image_url}
                    alt={band.band_name}
                    className="mb-2 h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20 md:h-24 md:w-24"
                  />
                ) : (
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border bg-slate-700 text-2xl font-bold text-yellow-100 sm:h-20 sm:w-20 md:h-24 md:w-24 md:text-3xl">
                    {band.band_name?.charAt(0).toUpperCase()}
                  </div>
                )}

                <h3 className="text-sm font-semibold text-yellow-100 sm:text-base">
                  {band.band_name}
                </h3>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="mb-2 text-sm font-semibold text-neutral-400">
              Look through{" "}
              <span className="text-yellow-100 text-xl">{bandCount}</span> other
              bands
            </p>
            <Link
              href="/bands"
              className="flex flex-row ml-auto min-h-10 w-fit items-center  rounded-md border border-[#4b432d]  px-4 py-2 text-sm font-semibold transition hover:bg-yellow-100 hover:text-neutral-900"
            >
              See all bands
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
