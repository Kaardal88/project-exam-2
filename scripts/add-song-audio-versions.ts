/**
 * One-off: creates song_audio_versions and gives every song that already has
 * audio a first version row, so the log starts complete rather than empty.
 *
 * Written by hand rather than generated. The snapshot in drizzle/ is from the
 * first migration and the schema has drifted well past it -- handles,
 * visibility, slug history and collaborators were all pushed directly -- so
 * both `drizzle-kit generate` and `drizzle-kit push` want to reconcile that
 * whole drift against a database with real data in it. This only adds one
 * table and touches nothing that exists.
 *
 * Safe to run twice: the create is IF NOT EXISTS, and the backfill skips any
 * song that already has a version.
 *
 * Run with:  npx tsx scripts/add-song-audio-versions.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { song_audio_versions } from "@/server/db/schema";

const dryRun = process.argv.includes("--dry");

async function createTable() {
  // Foreign keys are inline so the whole statement is idempotent -- Postgres
  // has no ADD CONSTRAINT IF NOT EXISTS to fall back on.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "song_audio_versions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "r2_key" text NOT NULL,
      "label" varchar(255) NOT NULL,
      "note" text,
      "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now()
    )
  `);

  // Every read is "the versions of this song", so the lookup gets an index.
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "song_audio_versions_song_id_idx"
      ON "song_audio_versions" ("song_id")
  `);
}

async function main() {
  if (dryRun) {
    console.log("--dry: nothing will be written\n");
  } else {
    await createTable();
    console.log("song_audio_versions is present\n");
  }

  const allSongs = await db.query.songs.findMany({
    columns: {
      id: true,
      title: true,
      audio_url: true,
      created_by: true,
      created_at: true,
    },
  });

  const withAudio = allSongs.filter((song) => song.audio_url);

  console.log(
    `${allSongs.length} songs, ${withAudio.length} with audio to backfill\n`,
  );

  if (dryRun) {
    for (const song of withAudio) {
      console.log(`would add "Version 1" to ${song.title}`);
    }
    return;
  }

  for (const song of withAudio) {
    const existing = await db.query.song_audio_versions.findFirst({
      where: (versions, { eq }) => eq(versions.song_id, song.id),
    });

    if (existing) {
      console.log(`skipped ${song.title} — already has versions`);
      continue;
    }

    await db.insert(song_audio_versions).values({
      song_id: song.id,
      r2_key: song.audio_url!,
      label: "Version 1",
      note: "The audio this song had before versions were kept.",
      uploaded_by: song.created_by,
      // Backdated to the song, not to now: this take is as old as the song is,
      // and a log that claims otherwise is worse than no log.
      created_at: song.created_at ?? new Date(),
    });

    console.log(`added "Version 1" to ${song.title}`);
  }
}

void main();
