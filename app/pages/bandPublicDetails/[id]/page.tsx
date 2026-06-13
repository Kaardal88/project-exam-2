"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

type Band = {
  id: string;
  band_name: string;
  bio?: string;
  image_url?: string | null;
  members?: Member[];
  spotify_url?: string | null;
  bandcamp_url?: string | null;
  youtube_url?: string | null;
  tidal_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  tiktok_url?: string | null;
  website_url?: string | null;
};

type Member = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
  user: {
    username: string | null;
    image_url?: string | null;
  };
};

export default function BandPublicDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [showMembers, setShowMembers] = useState<Member[]>([]);

  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [bandcampUrl, setBandcampUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tidalUrl, setTidalUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  useEffect(() => {
    if (!id) return;

    async function loadBandDetails() {
      try {
        const response = await fetch(`/api/bands/public/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load band details");
        }

        setBand(data);
        setShowMembers(data.members ?? []);
        setSpotifyUrl(data.band?.spotify_url ?? "");
        setBandcampUrl(data.band?.bandcamp_url ?? "");
        setYoutubeUrl(data.band?.youtube_url ?? "");
        setTidalUrl(data.band?.tidal_url ?? "");
        setInstagramUrl(data.band?.instagram_url ?? "");
        setFacebookUrl(data.band?.facebook_url ?? "");
        setTiktokUrl(data.band?.tiktok_url ?? "");
        setWebsiteUrl(data.band?.website_url ?? "");
      } catch {
        setError("Could not load band details");
      } finally {
        setLoading(false);
      }
    }

    loadBandDetails();
  }, [id]);

  if (loading)
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-yellow-100">
        Loading...
      </main>
    );
  if (error)
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-red-300">
        {error}
      </main>
    );
  if (!band)
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-yellow-100">
        Band not found
      </main>
    );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#1a1a1a,#050505_60%)] px-4 py-8 text-yellow-100">
      <div className="flex w-max mx-auto justify-center mb-12 bg-[#f3e7b6] text-neutral-950 px-8 sm:px-10 py-3 font-black shadow-[0_8px_25px_rgba(0,0,0,0.45)] -rotate-3 [clip-path:polygon(6%_0%,94%_0%,98%_8%,95%_18%,99%_28%,94%_42%,97%_56%,93%_72%,98%_88%,95%_100%,6%_100%,2%_92%,5%_80%,1%_68%,6%_54%,2%_38%,5%_22%,1%_10%)]">
        <Link href="/pages/allBandsPage">
          <span className="text-3xl md:text-4xl font-black tracking-tight hover:opacity-90 transition font-[family-name:var(--font-marker)]">
            Vardo
          </span>
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-block  border border-yellow-100/50 rounded-md px-5 py-2 text-sm font-bold text-black shadow-md transition hover:bg-yellow-200 hover:text-black!"
        >
          ‹ Back
        </Link>

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

              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-yellow-50">
                <span>Black Metal</span>
                <span>Norway 🇳🇴</span>
                <span>Anno 2017</span>
              </div>
            </div>
          </div>

          <div className="mb-6 mx-auto mt-10 max-w-2xl border border-yellow-100/30 px-4 py-2 text-center text-sm">
            Members:{" "}
            {showMembers.length > 0
              ? showMembers
                  .map((member) => member.user?.username || "Unknown member")
                  .join(" — ")
              : "Unknown"}
          </div>

          <div className="mx-auto mt-10 grid max-w-2xl gap-8 md:grid-cols-2">
            <InfoCard title="Listen">
              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  {band?.spotify_url && (
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

                  {band?.bandcamp_url && (
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

                  {band?.youtube_url && (
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

                  {band?.tidal_url && (
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
                {band.discography || "No discography yet."}
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
              {band?.website_url && (
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
              {band?.tiktok_url && (
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
              {band?.instagram_url && (
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
              {band?.facebook_url && (
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
    </main>
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

function PublicLink({ label }: { label: string }) {
  return (
    <div className="mb-2 border border-yellow-100/30 px-4 py-2 text-sm">
      {label}
    </div>
  );
}

function DiscographyItem({ title, year }: { title: string; year: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-4 text-sm">
      <span>{title}</span>
      <span>{year}</span>
    </div>
  );
}
