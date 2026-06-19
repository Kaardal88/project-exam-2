"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PreviewMixer } from "@/components/home/PreviewMixer";

type Band = {
  id: string;
  band_name: string;
  bio?: string;
  image_url?: string | null;
};

export default function HomePage() {
  const [featuredBands, setFeaturedBands] = useState<Band[]>([]);
  const [bands, setBands] = useState<Band[]>([]);

  useEffect(() => {
    async function loadBands() {
      const response = await fetch("/api/bands/public");
      const data = await response.json();

      if (response.ok) {
        setBands(data);

        const shuffledBands = [...data].sort(() => Math.random() - 0.5);
        setFeaturedBands(shuffledBands.slice(0, 4));
      }
    }

    loadBands();
  }, []);

  const bandCount = bands.length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,229,150,0.10),transparent_28%),linear-gradient(to_bottom,#0a0a0a,#171717)] text-yellow-100">
      {/*Hero section*/}
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-10 text-center sm:py-14 md:min-h-screen md:py-16">
        <div
          className="
        flex  items-center justify-center
        bg-[#f3e7b6] text-neutral-950
        px-24 py-8
        font-[family-name:var(--font-marker)]
         font-black tracking-tight
        shadow-[0_8px_25px_rgba(0,0,0,0.45)]
        -rotate-2 text-4xl
        md:text-5xl lg:text-8xl
        [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]
      "
        >
          VARDO
        </div>

        <section className="pt-12 flex flex-col items-center gap-4 sm:mt-12 sm:gap-6">
          <h1 className="max-w-[12ch] text-2xl md:text-4xl lg:text-5xl font-[family-name:var(--font-marker)]  uppercase tracking-wide">
            Make music. Not mess.
          </h1>

          <p className="max-w-xl font-[family-name:var(--font-caveat)] text-1xl md:text-2xl  leading-relaxed text-[#e6d98d] md:text-3xl ">
            Plan, share and track progress with your band — or by yourself.
          </p>

          <div className="mt-6 flex w-full max-w-xs items-center justify-center gap-3 sm:max-w-none sm:mt-8 sm:gap-6">
            <Link
              href="/pages/auth/login"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#4b432d] bg-neutral-900 px-4 py-2 text-sm font-semibold text-[#f5f0d8] transition hover:bg-neutral-800 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base"
            >
              Log in
            </Link>

            <Link
              href="/pages/auth/register"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-[#4b432d] bg-yellow-100 px-4 py-2 text-sm font-bold !text-black transition duration-300 ease-in-out hover:-translate-y-1 hover:scale-105 hover:bg-yellow-200 sm:min-h-12 sm:px-5 sm:py-3 sm:text-base"
            >
              Create account
            </Link>
          </div>
        </section>
      </div>

      <PreviewMixer />

      <section className="bands-section mt-24! mb-24!">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-100 font-[family-name:var(--font-caveat)]">
          Bands on the stage
        </h2>

        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          <div className="grid w-full max-w-6xl grid-cols-2 gap-3 rounded-md border border-neutral-700 bg-neutral-900/80 p-3 sm:grid-cols-3 sm:gap-4 sm:p-5 md:grid-cols-4 lg:grid-cols-4">
            {featuredBands.map((band) => (
              <Link
                key={band.id}
                href={`/pages/bandPublicDetails/${band.id}`}
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
              href="/pages/allBandsPage"
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
