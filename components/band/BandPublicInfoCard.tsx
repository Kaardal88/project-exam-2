"use client";

import {
  FaSpotify,
  FaYoutube,
  FaBandcamp,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaMusic,
  FaGlobe,
} from "react-icons/fa";
import { ExternalLink } from "lucide-react";
import countries from "world-countries";
import ReactCountryFlag from "react-country-flag";

export type PublicBand = {
  id: string;
  band_name: string;
  bio: string | null;
  image_url?: string | null;
  header_image_url?: string | null;
  country?: string | null;
  spotify_url?: string | null;
  bandcamp_url?: string | null;
  youtube_url?: string | null;
  tidal_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  website_url?: string | null;
};

export type PublicMember = {
  user_id: string;
  user: {
    username: string | null;
    image_url?: string | null;
  };
};

const countryOptions = countries.map((country) => ({
  value: country.cca2,
  label: country.name.common,
}));

export function BandPublicInfoCard({
  band,
  members = [],
}: {
  band: PublicBand;
  members?: PublicMember[];
}) {
  const countryInfo = countryOptions.find(
    (option) => option.value === band.country,
  );

  return (
    <div className="mx-auto max-w-4xl">
      <section className="relative overflow-hidden border mb-12 border-neutral-700 bg-black/70 p-4 shadow-[0_0_40px_rgba(180,140,60,0.25)]">
        <div className="absolute left-3 top-3 h-6 w-6 opacity-90 z-10">
          <img
            src="/svg/hardware/panel-screw.png"
            alt="Panel Screw"
            className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          />
        </div>

        <div className="absolute right-3 top-3 z-10 h-6 w-6">
          <img
            src="/svg/hardware/panel-screw.png"
            alt="Panel Screw"
            className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          />
        </div>
        <div className="absolute bottom-3 left-3 h-6 w-6">
          <img
            src="/svg/hardware/panel-screw.png"
            alt="Panel Screw"
            className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          />
        </div>

        <div className="absolute bottom-3 right-3 h-6 w-6 opacity-90">
          <img
            src="/svg/hardware/panel-screw.png"
            alt="Panel Screw"
            className="h-full w-full object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
          />
        </div>

        <div
          className="relative min-h-[360px] bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.9)), url(${band.image_url || "/placeholder-band.jpg"})`,
          }}
        >
          <div className="absolute bottom-8 left-1/2 w-full -translate-x-1/2 px-4 text-center">
            <h2 className="text-5xl font-black text-yellow-50 drop-shadow">
              {band.band_name}
            </h2>

            <div className="mx-auto my-3 h-px w-48 bg-yellow-700/60" />

            {countryInfo && (
              <div className="flex items-center justify-center gap-2 text-sm text-yellow-50">
                <ReactCountryFlag countryCode={countryInfo.value} svg />
                <span>{countryInfo.label}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 mx-auto mt-10 max-w-2xl border border-yellow-100/30 px-4 py-2 text-center text-sm">
          Members:{" "}
          {members.length > 0
            ? members
                .map((member) => member.user?.username || "Unknown member")
                .join(" — ")
            : "Unknown"}
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl gap-8 md:grid-cols-2">
          <InfoCard title="Listen">
            <div className="flex flex-col gap-6">
              <div className="space-y-3">
                {band.spotify_url && (
                  <a
                    href={band.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaSpotify className="h-5 w-5 text-green-500" />
                      <span>Spotify</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band.bandcamp_url && (
                  <a
                    href={band.bandcamp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaBandcamp className="h-5 w-5 text-green-500" />
                      <span>Bandcamp</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band.youtube_url && (
                  <a
                    href={band.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaYoutube className="h-5 w-5 text-red-500" />
                      <span>Youtube</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}

                {band.tidal_url && (
                  <a
                    href={band.tidal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <FaMusic className="h-5 w-5 text-black" />
                      <span>Tidal</span>
                    </div>

                    <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
                  </a>
                )}
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Discography">
            <p className="text-sm leading-relaxed text-yellow-50/85">
              No discography yet.
            </p>
          </InfoCard>
        </div>

        <InfoCard title="Bio" className="mx-auto mt-10 max-w-2xl">
          <p className="text-sm leading-relaxed text-yellow-50/85">
            {band.bio || "No bio yet."}
          </p>
        </InfoCard>

        <section className="mt-10 pb-8 text-center">
          <h3 className="mb-4 font-black">Follow</h3>
          <div className="flex justify-center gap-4 text-2xl">
            {band.website_url && (
              <a
                href={band.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <FaGlobe className="h-5 w-5 text-blue-500" />
                  <span>Website</span>
                </div>

                <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
              </a>
            )}
            {band.tiktok_url && (
              <a
                href={band.tiktok_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <FaTiktok className="h-5 w-5 text-black" />
                  <span>TikTok</span>
                </div>

                <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
              </a>
            )}
            {band.instagram_url && (
              <a
                href={band.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <FaInstagram className="h-5 w-5 text-pink-500" />
                  <span>Instagram</span>
                </div>

                <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
              </a>
            )}
            {band.facebook_url && (
              <a
                href={band.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-md border border-neutral-700 bg-neutral-950/60 px-4 py-3 transition hover:border-yellow-200 hover:bg-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <FaFacebook className="h-5 w-5 text-blue-500" />
                  <span>Facebook</span>
                </div>

                <ExternalLink className="h-4 w-4 text-neutral-500 transition group-hover:text-yellow-100" />
              </a>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}

function InfoCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`border border-neutral-700 bg-black/60 p-6 text-yellow-50 shadow-[0_0_25px_rgba(160,100,30,0.35)] ${className}`}
    >
      <h3 className="mb-5 text-center font-black">{title}</h3>
      {children}
    </section>
  );
}
