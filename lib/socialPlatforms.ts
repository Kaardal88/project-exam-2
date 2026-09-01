import type { IconType } from "react-icons";
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

/**
 * The places a band can link out to, in the order they are shown.
 *
 * One list rather than eight copies of the same markup, because the links are
 * now both displayed and edited: without this, adding a platform would mean
 * writing it out in a display block and again in a form field, and the two
 * would drift. The `column` is the database column, which is what the update
 * route takes.
 */
export const socialPlatforms = [
  { column: "spotify_url", label: "Spotify", icon: FaSpotify, colorClass: "text-green-500" },
  { column: "bandcamp_url", label: "Bandcamp", icon: FaBandcamp, colorClass: "text-green-500" },
  { column: "youtube_url", label: "Youtube", icon: FaYoutube, colorClass: "text-red-500" },
  { column: "facebook_url", label: "Facebook", icon: FaFacebook, colorClass: "text-blue-500" },
  { column: "instagram_url", label: "Instagram", icon: FaInstagram, colorClass: "text-pink-500" },
  { column: "tiktok_url", label: "TikTok", icon: FaTiktok, colorClass: "text-neutral-300" },
  { column: "tidal_url", label: "Tidal", icon: FaMusic, colorClass: "text-neutral-300" },
  { column: "website_url", label: "Website", icon: FaGlobe, colorClass: "text-blue-500" },
] as const satisfies ReadonlyArray<{
  column: string;
  label: string;
  icon: IconType;
  colorClass: string;
}>;

export type SocialColumn = (typeof socialPlatforms)[number]["column"];

/** The shape both the display and the form pass around. */
export type SocialLinkValues = Partial<Record<SocialColumn, string | null>>;
