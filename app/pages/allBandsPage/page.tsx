"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import countries from "world-countries";
import ReactCountryFlag from "react-country-flag";
import { NavBar } from "@/components/NavBar";
import { BackButton } from "@/components/BackButton";
import AmpLoader from "@/components/AmpLoader";

type Band = {
  id: string;
  band_name: string;
  bio?: string;
  image_url?: string | null;
  country?: string | null;
  genre?: string | null;
};

const countryOptions = countries.map((country) => ({
  value: country.cca2,
  label: country.name.common,
}));

export default function BandsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bands, setBands] = useState<Band[]>([]);

  useEffect(() => {
    async function loadBands() {
      try {
        const response = await fetch("/api/bands/public");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load bands");
        }

        setBands(data);
      } catch (err) {
        setError("Could not load bands");
      } finally {
        setLoading(false);
      }
    }

    loadBands();
  }, []);

  if (loading)
    return (
      <main className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900">
        <AmpLoader />
      </main>
    );
  if (error) return <p>{error}</p>;

  return (
    <main className="w-full min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-slate-900 text-yellow-100">
      <NavBar />
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <BackButton />

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 w-full max-w-6xl mx-auto mt-6 bg-neutral-900/80 rounded-md p-6 border border-neutral-700">
          {bands.map((band) => {
            const countryInfo = countryOptions.find(
              (option) => option.value === band.country,
            );

            return (
              <Link
                key={band.id}
                href={`/pages/bandProfile?id=${band.id}`}
                style={{ backgroundImage: "url('/bg-components.jpg')" }}
                className="relative flex flex-col items-center overflow-hidden rounded-md border border-neutral-600/70 bg-cover bg-center p-6 text-center shadow-[inset_0_4px_6px_rgba(255,255,255,0.01),0_8px_16px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:scale-[1.03] hover:border-yellow-200/60"
              >
                <div className="absolute inset-0 bg-black/55" />

                <div className="absolute left-2 top-2 z-10 h-4 w-4 opacity-90">
                  <img
                    src="/svg/hardware/panel-screw.png"
                    alt="Panel Screw"
                    className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  />
                </div>
                <div className="absolute right-2 top-2 z-10 h-4 w-4">
                  <img
                    src="/svg/hardware/panel-screw.png"
                    alt="Panel Screw"
                    className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  />
                </div>
                <div className="absolute bottom-2 left-2 z-10 h-4 w-4">
                  <img
                    src="/svg/hardware/panel-screw.png"
                    alt="Panel Screw"
                    className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  />
                </div>
                <div className="absolute bottom-2 right-2 z-10 h-4 w-4 opacity-90">
                  <img
                    src="/svg/hardware/panel-screw.png"
                    alt="Panel Screw"
                    className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                  />
                </div>

                <div className="relative z-10 flex flex-col items-center">
                  {band.image_url ? (
                    <img
                      src={band.image_url}
                      alt={band.band_name}
                      className="mb-3 h-24 w-24 rounded-full object-cover shadow-[0_0_16px_rgba(245,158,11,0.4)]"
                    />
                  ) : (
                    <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-bold text-yellow-100 border shadow-[0_0_16px_rgba(245,158,11,0.4)]">
                      {band.band_name?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <h3 className="font-semibold text-yellow-100">
                    {band.band_name}
                  </h3>

                  {band.genre && (
                    <p className="mt-1 text-xs text-neutral-400">
                      {band.genre}
                    </p>
                  )}

                  {countryInfo && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-neutral-300">
                      <ReactCountryFlag countryCode={countryInfo.value} svg />
                      <span>{countryInfo.label}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
