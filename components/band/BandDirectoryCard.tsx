"use client";

import Link from "next/link";
import ReactCountryFlag from "react-country-flag";

export type DirectoryBand = {
  id: string;
  slug: string;
  band_name: string;
  bio?: string | null;
  image_url?: string | null;
  country?: string | null;
  genre?: string | null;
  created_at?: string | null;
};

type BandDirectoryCardProps = {
  band: DirectoryBand;
  countryLabel?: string;
};

/**
 * One band in the Artists directory.
 *
 * Lifted out of app/bands/page.tsx unchanged — the panel screws, the darkened
 * photo and the amber glow are what makes the page look like a rack of gear
 * rather than a search result, and the spotlight the "Show me something new"
 * button fills needs the same card. Two copies of this markup would have
 * drifted apart the first time either was touched.
 */
export function BandDirectoryCard({
  band,
  countryLabel,
}: BandDirectoryCardProps) {
  return (
    <Link
      href={`/band/${band.slug ?? band.id}`}
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
          <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-full border bg-slate-700 text-3xl font-bold text-yellow-100 shadow-[0_0_16px_rgba(245,158,11,0.4)]">
            {band.band_name?.charAt(0).toUpperCase()}
          </div>
        )}

        <h3 className="font-semibold text-yellow-100">{band.band_name}</h3>

        {band.genre && (
          <p className="mt-1 text-xs text-neutral-400">{band.genre}</p>
        )}

        {countryLabel && band.country && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-neutral-300">
            <ReactCountryFlag countryCode={band.country} svg />
            <span>{countryLabel}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
