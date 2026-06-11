import { db } from "@/server/db";
import { bands } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function getBands() {
  return db.query.bands.findMany();
}

export async function getBandById(id: string) {
  return db.query.bands.findFirst({
    where: eq(bands.id, id),
  });
}

export async function getBandBySlug(slug: string) {
  return db.query.bands.findFirst({
    where: eq(bands.slug, slug),
  });
}

export async function updateBand(
  id: string,
  data: {
    band_name?: string;
    bio?: string;
    image_url?: string;
    header_image_url?: string;
    slug?: string;
    country?: string;
    spotify_url?: string;
    bandcamp_url?: string;
    youtube_url?: string;
    tidal_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    tiktok_url?: string;
    website_url?: string;
  },
) {
  const [updatedBand] = await db
    .update(bands)
    .set({
      band_name: data.band_name,
      bio: data.bio,
      image_url: data.image_url,
      header_image_url: data.header_image_url,
      slug: data.slug,
      country: data.country,
      spotify_url: data.spotify_url,
      bandcamp_url: data.bandcamp_url,
      youtube_url: data.youtube_url,
      tidal_url: data.tidal_url,
      instagram_url: data.instagram_url,
      facebook_url: data.facebook_url,
      tiktok_url: data.tiktok_url,
      website_url: data.website_url,
    })
    .where(eq(bands.id, id))
    .returning();

  return updatedBand;
}

export async function deleteBand(id: string) {
  return db.delete(bands).where(eq(bands.id, id));
}
