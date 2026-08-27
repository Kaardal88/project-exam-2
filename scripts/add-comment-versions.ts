/**
 * One-off: lets a comment be about a version, and lets it be about no
 * particular moment.
 *
 * See docs/decisions/comments-on-versions.md. Two nullable columns, and the
 * interesting part is what the backfill has to do: nothing.
 *
 * Every existing comment keeps its timestamp and gets a null version, which
 * reads as "a moment in the song, whatever version is playing". That is exactly
 * what those comments were — they were written before versions existed, so they
 * were never about one, and guessing otherwise would put words in people's
 * mouths.
 *
 * Safe to run twice: ADD COLUMN IF NOT EXISTS, and DROP NOT NULL on a column
 * that is already nullable does nothing.
 *
 * Run with:  npx tsx scripts/add-comment-versions.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

const dryRun = process.argv.includes("--dry");

async function migrate() {
  await db.execute(sql`
    ALTER TABLE "song_comments"
      ADD COLUMN IF NOT EXISTS "song_version_id" uuid
      REFERENCES "song_versions"("id") ON DELETE NO ACTION
  `);

  // Untimed comments -- "we need a bridge" is not a moment in the song.
  await db.execute(sql`
    ALTER TABLE "song_comments"
      ALTER COLUMN "timestamp_seconds" DROP NOT NULL
  `);
}

async function main() {
  const before = await db.execute(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE timestamp_seconds IS NOT NULL)::int AS timed
      FROM "song_comments"
  `);

  const { total, timed } = before.rows[0] as { total: number; timed: number };

  console.log(
    `\n${total} comments, ${timed} pinned to a timestamp.\n` +
      `All of them stay as they are: timestamp kept, version null — ` +
      `"a moment in the song, whatever version".\n`,
  );

  if (dryRun) {
    console.log("--dry: would add song_version_id and drop NOT NULL from");
    console.log("       timestamp_seconds on song_comments. Nothing else.");
    return;
  }

  await migrate();

  const after = await db.execute(sql`
    SELECT column_name, is_nullable
      FROM information_schema.columns
     WHERE table_name = 'song_comments'
       AND column_name IN ('song_version_id', 'timestamp_seconds')
     ORDER BY column_name
  `);

  console.table(after.rows);
  console.log("song_comments is ready for versions.\n");
}

void main();
