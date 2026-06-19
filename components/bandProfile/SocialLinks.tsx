import { ProfileSection } from "@/components/bandProfile/ProfileSection";
import {
  FaSpotify,
  FaBandcamp,
  FaYoutube,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaGlobe,
  FaMusic,
} from "react-icons/fa";

import { ExternalLink } from "lucide-react";

type SocialsProps = {
  band: {
    spotify_url?: string | null;
    bandcamp_url?: string | null;
    youtube_url?: string | null;
    tidal_url?: string | null;
    instagram_url?: string | null;
    facebook_url?: string | null;
    tiktok_url?: string | null;
    website_url?: string | null;
  } | null;
};

export function SocialLinks({ band }: SocialsProps) {
  return (
    <ProfileSection title="Social links">
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
      </div>
    </ProfileSection>
  );
}
