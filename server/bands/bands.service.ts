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
    })
    .where(eq(bands.id, id))
    .returning();

  return updatedBand;
}

export async function deleteBand(id: string) {
  return db.delete(bands).where(eq(bands.id, id));
}
