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
  const [bands, setBands] = useState<Band[]>([]);

  useEffect(() => {
    async function loadBands() {
      const response = await fetch("/api/bands/public");
      const data = await response.json();

      if (response.ok) {
        setBands(data);
      }
    }

    loadBands();
  }, []);
  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(255,229,150,0.10),transparent_28%),linear-gradient(to_bottom,#0a0a0a,#171717)] text-yellow-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-start px-6 pt-20 text-center mt-20">
        <div
          className="
        flex w-max justify-center
        bg-[#f3e7b6] text-neutral-950
        px-24 py-8
        font-[family-name:var(--font-marker)]
        text-6xl font-black tracking-tight
        shadow-[0_8px_25px_rgba(0,0,0,0.45)]
        -rotate-2
        md:text-5xl lg:text-8xl
        [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]
      "
        >
          VARDO
        </div>

        <section className="mt-64 flex flex-col items-center gap-6">
          <h1 className="max-w-[12ch] font-[family-name:var(--font-marker)] text-[clamp(2rem,10vw,3rem)] leading-[0.95] uppercase tracking-wide">
            Make music. Not mess.
          </h1>

          <p className="max-w-xl font-[family-name:var(--font-caveat)] text-2xl leading-relaxed text-[#e6d98d] md:text-3xl">
            Plan, share and track progress with your band — or by yourself.
          </p>

          <div className="flex w-full max-w-xs flex-col items-center justify-center gap-8 sm:max-w-none sm:flex-row">
            <Link
              href="/pages/auth/login"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#4b432d] bg-neutral-900 px-5 py-3 font-semibold text-[#f5f0d8] transition hover:bg-neutral-800"
            >
              Log in
            </Link>

            <Link
              href="/pages/auth/register"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[#4b432d] bg-yellow-100 px-5 py-3 font-bold !text-black transition duration-300 ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-yellow-200"
            >
              Create account
            </Link>
          </div>
        </section>
      </div>

      <PreviewMixer />

      <section className="bands-section">
        <h2>Bands on the stage</h2>

        <div className="w-full max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full max-w-6xl mx-auto mt-6 bg-neutral-900/80 rounded-md p-6 border border-neutral-700">
            <div className="flex flex-col items-center rounded-md  p-6 text-center shadow-xl border border-neutral-700" />
            {bands.map((band) => (
              <Link
                className="flex flex-col items-center rounded-md  p-6 text-center shadow-xl border border-neutral-700"
                key={band.id}
                href={`/pages/bandPublicDetails/${band.id}`}
              >
                {band.image_url ? (
                  <img
                    src={band.image_url}
                    alt={band.band_name}
                    className="mb-3 h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-yellow-100 border ">
                    {band.band_name?.charAt(0).toUpperCase()}
                  </div>
                )}

                <h3 className="font-semibold text-yellow-100">
                  {band.band_name}
                </h3>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href="/pages/allBandsPage"
              className="btn btn-accent transition hover:bg-yellow-100 hover:text-neutral-900"
            >
              See all bands
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
