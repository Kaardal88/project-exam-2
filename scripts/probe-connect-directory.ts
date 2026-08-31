/**
 * Probe: runs every shape of Connect directory query against the real
 * database, because two of them are hand-written SQL that TypeScript cannot
 * check.
 *
 * The array overlap (`tags && ARRAY[...]`) and the relevance sort's
 * `unnest(...)` subquery are the reason this exists. Both compile happily and
 * either works or throws only when Postgres sees them, and a filter that
 * throws looks exactly like a filter that found nothing.
 *
 * Reads only. Following scripts/probe-batch.ts, which is what established that
 * db.batch() really does roll back.
 *
 * Run with:  npx tsx scripts/probe-connect-directory.ts
 */

import "dotenv/config";
import { getDirectory } from "@/server/users/users.directory";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

async function main() {
  const [someone] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .limit(1);

  if (!someone) {
    console.log("No users to probe against.");
    return;
  }

  const cases: { name: string; filters: Parameters<typeof getDirectory>[0] }[] =
    [
      { name: "unfiltered, newest", filters: { sort: "newest", limit: 5 } },
      { name: "alphabetical", filters: { sort: "alphabetical", limit: 5 } },
      { name: "search", filters: { q: someone.username.slice(0, 3) } },
      { name: "one tag", filters: { tags: ["drummer"] } },
      { name: "two tags (overlap)", filters: { tags: ["drummer", "singer"] } },
      {
        name: "relevance sort",
        filters: { tags: ["drummer", "singer", "producer"], sort: "relevant" },
      },
      { name: "band role", filters: { roles: ["band_leader"] } },
      { name: "guest role", filters: { roles: ["producer"] } },
      {
        name: "band + guest role",
        filters: { roles: ["member", "guest_musician"] },
      },
      { name: "country", filters: { country: "NO" } },
      {
        name: "everything at once",
        filters: {
          q: "a",
          tags: ["drummer"],
          roles: ["band_leader"],
          country: "NO",
          sort: "relevant",
        },
      },
      { name: "unknown role matches nothing", filters: { roles: ["nonsense"] } },
      { name: "page two", filters: { limit: 5, offset: 5 } },
    ];

  for (const testCase of cases) {
    try {
      const result = await getDirectory(testCase.filters, someone.id);

      console.log(
        `ok   ${testCase.name.padEnd(30)} ${result.users.length} rows / ${result.total} total / hasMore=${result.hasMore}`,
      );
    } catch (error) {
      console.log(`FAIL ${testCase.name.padEnd(30)} ${String(error)}`);
    }
  }

  console.log("\nSame query with a band in context (invite status per row):");

  const withBand = await getDirectory({ limit: 3, bandId: someone.id }, someone.id);

  console.log(
    "  a user id in place of a band id resolves to no leadership, so invite is absent:",
    withBand.users.every((user) => user.invite === undefined),
  );
}

void main();
