/**
 * One-off: removes the note scripts/add-song-stems.ts wrote onto every song it
 * migrated -- "Where the song stood when stems arrived", sometimes followed by
 * how many earlier takes were kept in Full mix.
 *
 * It was written for whoever ran the migration, and it reads that way: a band
 * that uploaded one finished mp3 and has never seen the word "stems" opens the
 * studio to a sentence about stems arriving. A version's note is the band's
 * place to say what changed, and this one was never theirs.
 *
 * Only notes on version 1 that begin with the exact generated sentence are
 * touched, so anything a band wrote since is left alone. The version's label
 * ("Version 2", say) is the band's old name for the take and stays as it is.
 *
 * Safe to run twice: a cleared note no longer matches.
 *
 * Run with:  npx tsx scripts/clear-migration-notes.ts
 * Add --dry to list what would change without touching the database.
 */

import "dotenv/config";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/server/db";
import { songs, song_versions } from "@/server/db/schema";

const dryRun = process.argv.includes("--dry");

const GENERATED_NOTE = "Where the song stood when stems arrived.%";

const matchesGenerated = and(
  eq(song_versions.version_number, 1),
  like(song_versions.note, GENERATED_NOTE),
);

async function main() {
  if (dryRun) console.log("--dry: nothing will be written\n");

  const found = await db
    .select({
      id: song_versions.id,
      label: song_versions.label,
      note: song_versions.note,
      title: songs.title,
    })
    .from(song_versions)
    .innerJoin(songs, eq(songs.id, song_versions.song_id))
    .where(matchesGenerated);

  for (const version of found) {
    console.log(
      `${dryRun ? "would clear" : "clearing"} "${version.title}" v1 ` +
        `("${version.label}"): ${version.note}`,
    );
  }

  if (!dryRun && found.length > 0) {
    await db
      .update(song_versions)
      .set({ note: null })
      .where(matchesGenerated);
  }

  console.log(
    `\n${found.length} note${found.length === 1 ? "" : "s"} ` +
      `${dryRun ? "to clear" : "cleared"}`,
  );
}

void main();
