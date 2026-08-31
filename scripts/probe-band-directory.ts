/**
 * Probe: runs every shape of the public band directory query against the real
 * database, the sibling of scripts/probe-connect-directory.ts.
 *
 * The two things worth checking here are not type errors. First, that the
 * visibility filter is not negotiable — a private band appearing in a listing
 * is the only bug on this page that matters. Second, that `sort=random` really
 * varies, since a random sort that quietly returns the same row every time
 * looks exactly like a working one until someone presses the button twice.
 *
 * Reads only.
 *
 * Run with:  npx tsx scripts/probe-band-directory.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { getPublicBands } from "@/server/bands/bands.directory";

async function main() {
  const cases: {
    name: string;
    filters: Parameters<typeof getPublicBands>[0];
  }[] = [
    { name: "unfiltered, newest", filters: { sort: "newest", limit: 5 } },
    { name: "alphabetical", filters: { sort: "alphabetical", limit: 5 } },
    { name: "search by name", filters: { q: "a" } },
    { name: "one genre", filters: { genres: ["Metal"] } },
    { name: "two genres", filters: { genres: ["Metal", "Rock"] } },
    { name: "country", filters: { country: "NO" } },
    {
      name: "genre + country + search",
      filters: { q: "a", genres: ["Metal"], country: "NO" },
    },
    { name: "page two", filters: { limit: 5, offset: 5 } },
    { name: "offset past the end", filters: { limit: 5, offset: 500 } },
    { name: "random, one", filters: { sort: "random", limit: 1 } },
    { name: "random within a filter", filters: { sort: "random", limit: 1, country: "NO" } },
    { name: "no such country", filters: { country: "ZZ" } },
  ];

  for (const testCase of cases) {
    try {
      const result = await getPublicBands(testCase.filters);

      console.log(
        `ok   ${testCase.name.padEnd(26)} ${result.bands.length} rows / ${result.total} total / hasMore=${result.hasMore}`,
      );
    } catch (error) {
      console.log(`FAIL ${testCase.name.padEnd(26)} ${String(error)}`);
    }
  }

  // The listing must never contain a band that is not public, whatever else
  // is asked of it.
  const [{ hidden }] = (
    await db.execute(
      sql`SELECT count(*)::int AS hidden FROM bands WHERE visibility <> 'public'`,
    )
  ).rows as { hidden: number }[];

  const everything = await getPublicBands({ limit: 48 });
  const all = await db.execute(sql`SELECT count(*)::int AS total FROM bands`);
  const { total } = all.rows[0] as { total: number };

  console.log(
    `\n${hidden} non-public band(s) in the table; the directory reports ${everything.total} of ${total}.`,
  );
  console.log(
    hidden > 0 && everything.total === total - hidden
      ? "ok   non-public bands are excluded"
      : hidden === 0
        ? "note nothing non-public to test against right now"
        : "FAIL a non-public band is reachable through the directory",
  );

  // A random sort that returns the same row every time reads as working.
  const draws = new Set<string>();

  for (let attempt = 0; attempt < 12; attempt++) {
    const drawn = await getPublicBands({ sort: "random", limit: 1 });
    if (drawn.bands[0]) draws.add(drawn.bands[0].id);
  }

  console.log(
    draws.size > 1
      ? `ok   twelve random draws returned ${draws.size} different bands`
      : "FAIL twelve random draws returned the same band every time",
  );
}

void main();
