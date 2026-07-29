"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { BackButton } from "@/components/BackButton";
import AmpLoader from "@/components/AmpLoader";

type Band = {
  id: string;
  band_name: string;
  bio?: string;
  image_url?: string | null;
};

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
          <div className="flex flex-col items-center rounded-md  p-6 text-center shadow-xl border border-neutral-700" />
          {bands.map((band) => (
            <Link
              className="flex flex-col items-center rounded-md  p-6 text-center shadow-xl border border-neutral-700"
              key={band.id}
              href={`/pages/bandProfile?id=${band.id}`}
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
      </div>
    </main>
  );
}
