/**
 * One-off backfill: regenerates every band slug with the current slugify()
 * rules.
 *
 * Slugs created before lib/slug.ts existed came from
 * `band_name.toLowerCase().replace(/\s+/g, "-")`, which left slashes, "ø",
 * "æ" and "å" untouched and had no collision handling at all. This rewrites
 * them all.
 *
 * Run with:  npx tsx scripts/backfill-band-slugs.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { bands } from "@/server/db/schema";
import { slugify, isReservedSlug } from "@/lib/slug";

const dryRun = process.argv.includes("--dry");

async function main() {
  const allBands = await db.query.bands.findMany({
    columns: { id: true, band_name: true, slug: true, created_at: true },
  });

  if (allBands.length === 0) {
    console.log("No bands found. Nothing to do.");
    return;
  }

  // Oldest first, so the band that has held a name longest keeps the bare
  // slug and newer namesakes take the numeric suffixes.
  const ordered = [...allBands].sort((a, b) => {
    const left = a.created_at ? new Date(a.created_at).getTime() : 0;
    const right = b.created_at ? new Date(b.created_at).getTime() : 0;
    return left - right;
  });

  const taken = new Set<string>();
  const plan: { id: string; name: string; from: string; to: string }[] = [];

  for (const band of ordered) {
    const base = slugify(band.band_name);
    let candidate = base;

    if (isReservedSlug(candidate) || taken.has(candidate)) {
      let suffix = 2;
      while (taken.has(`${base}-${suffix}`)) suffix++;
      candidate = `${base}-${suffix}`;
    }

    taken.add(candidate);

    if (candidate !== band.slug) {
      plan.push({
        id: band.id,
        name: band.band_name,
        from: band.slug,
        to: candidate,
      });
    }
  }

  console.log(`${allBands.length} bands, ${plan.length} need a new slug.`);

  for (const change of plan) {
    console.log(`  ${change.name}: ${change.from} -> ${change.to}`);
  }

  if (plan.length === 0) return;

  if (dryRun) {
    console.log("\n--dry given, no changes written.");
    return;
  }

  // Two passes, because slug is UNIQUE and the new assignment can overlap the
  // old one. If band A is "nordlys" and band B must become "nordlys" while A
  // becomes "nordlys-2", writing them one at a time hits the constraint
  // whichever order is used. Parking every affected row on a throwaway value
  // first removes the overlap entirely.
  console.log("\nPass 1: moving affected rows to temporary slugs...");
  for (const change of plan) {
    await db
      .update(bands)
      .set({ slug: `tmp-${change.id}` })
      .where(eq(bands.id, change.id));
  }

  console.log("Pass 2: writing final slugs...");
  for (const change of plan) {
    await db
      .update(bands)
      .set({ slug: change.to })
      .where(eq(bands.id, change.id));
  }

  console.log(`\nDone. ${plan.length} slugs updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
