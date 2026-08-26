/**
 * One-off: creates the four stem tables plus songs.current_version_id, and
 * turns every existing audio version into the "Full mix" stem's history, so
 * the new studio opens on a song's real past rather than an empty slate.
 *
 * See docs/decisions/stems-and-versioning.md. The shape of the backfill is the
 * point: a song that only ever had one finished mp3 becomes a song with one
 * stem, and every version, label, note, uploader and date it already had comes
 * across unchanged. Nothing about the old history is reinterpreted.
 *
 * Written by hand rather than generated. The snapshot in drizzle/ is from the
 * first migration and the schema has drifted well past it -- handles,
 * visibility, slug history, collaborators, audio versions and feedback were
 * all pushed directly -- so both `drizzle-kit generate` and `drizzle-kit push`
 * want to reconcile that whole drift against a database with real data in it.
 *
 * Safe to run twice. Creates are IF NOT EXISTS, the column add is IF NOT
 * EXISTS, and the backfill skips any song that already has a stem. Each song's
 * backfill is one db.batch(), which Neon runs as a single transaction -- so a
 * song is either fully migrated or untouched, and never half-migrated in a way
 * the skip guard would then step over on a re-run. (scripts/probe-batch.ts is
 * what established that batch really does roll back.)
 *
 * song_audio_versions is deliberately NOT dropped. It stays as the ground
 * truth in case this backfill turns out to be wrong. Dropping it is a separate
 * script, once the new tables have carried real use.
 *
 * Run with:  npx tsx scripts/add-song-stems.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  songs,
  song_stems,
  song_stem_takes,
  song_versions,
  song_version_stems,
} from "@/server/db/schema";
import { MIX_KIND, MIX_STEM_NAME } from "@/lib/stemKinds";

const dryRun = process.argv.includes("--dry");

type BatchStatement = Parameters<typeof db.batch>[0][number];

async function createTables() {
  // Foreign keys are inline so each statement is idempotent on its own --
  // Postgres has no ADD CONSTRAINT IF NOT EXISTS to fall back on.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "song_stems" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "name" varchar(80) NOT NULL,
      "kind" varchar(40) NOT NULL,
      "color" varchar(7),
      "sort_order" integer NOT NULL DEFAULT 0,
      "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "song_stems_song_id_idx"
      ON "song_stems" ("song_id")
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "song_stem_takes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "stem_id" uuid NOT NULL REFERENCES "song_stems"("id") ON DELETE CASCADE,
      "r2_key" text NOT NULL,
      "label" varchar(255) NOT NULL,
      "note" text,
      "format" varchar(10) NOT NULL DEFAULT 'mp3',
      "duration_seconds" integer,
      "sample_rate" integer,
      "bit_depth" integer,
      "byte_size" integer,
      "proxy_r2_key" text,
      "uploaded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now()
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "song_stem_takes_song_id_idx"
      ON "song_stem_takes" ("song_id")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "song_stem_takes_stem_id_idx"
      ON "song_stem_takes" ("stem_id")
  `);

  // UNIQUE (song_id, version_number) doubles as the lookup index for "the
  // versions of this song": song_id is leftmost, so no separate index.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "song_versions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "version_number" integer NOT NULL,
      "label" varchar(255) NOT NULL,
      "note" text,
      "locked_at" timestamp,
      "locked_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now(),
      UNIQUE ("song_id", "version_number")
    )
  `);

  // NO ACTION on both references is the model enforcing itself: a take or a
  // slot some version still points at cannot be deleted, because deleting it
  // would change what an already approved mix sounds like.
  //
  // NO ACTION rather than RESTRICT on purpose. Both refuse the delete, but
  // RESTRICT checks immediately while NO ACTION checks at the end of the
  // statement -- and deleting a song cascades into song_stems, song_stem_takes
  // and this table in one statement. Under RESTRICT the check fires against
  // rows the same statement is about to remove, so whether deleting a song,
  // a project or a band worked would depend on the order Postgres happened to
  // fire the constraints in.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "song_version_stems" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "song_version_id" uuid NOT NULL
        REFERENCES "song_versions"("id") ON DELETE CASCADE,
      "song_id" uuid NOT NULL REFERENCES "songs"("id") ON DELETE CASCADE,
      "stem_id" uuid NOT NULL REFERENCES "song_stems"("id") ON DELETE NO ACTION,
      "take_id" uuid NOT NULL
        REFERENCES "song_stem_takes"("id") ON DELETE NO ACTION,
      UNIQUE ("song_version_id", "stem_id")
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "song_version_stems_take_id_idx"
      ON "song_version_stems" ("take_id")
  `);

  // Both of these were created as RESTRICT before the ordering problem above
  // was understood. DROP IF EXISTS followed by ADD makes the pair idempotent,
  // and re-running it on a database that already has NO ACTION is a no-op in
  // effect.
  await db.execute(sql`
    ALTER TABLE "song_version_stems"
      DROP CONSTRAINT IF EXISTS "song_version_stems_stem_id_fkey"
  `);
  await db.execute(sql`
    ALTER TABLE "song_version_stems"
      ADD CONSTRAINT "song_version_stems_stem_id_fkey"
      FOREIGN KEY ("stem_id") REFERENCES "song_stems"("id") ON DELETE NO ACTION
  `);
  await db.execute(sql`
    ALTER TABLE "song_version_stems"
      DROP CONSTRAINT IF EXISTS "song_version_stems_take_id_fkey"
  `);
  await db.execute(sql`
    ALTER TABLE "song_version_stems"
      ADD CONSTRAINT "song_version_stems_take_id_fkey"
      FOREIGN KEY ("take_id") REFERENCES "song_stem_takes"("id") ON DELETE NO ACTION
  `);

  // Last, and it has to be last: this column references song_versions, so the
  // table has to exist before the constraint can be created. The circular
  // reference (songs -> song_versions -> songs) is fine for Postgres.
  await db.execute(sql`
    ALTER TABLE "songs"
      ADD COLUMN IF NOT EXISTS "current_version_id" uuid
      REFERENCES "song_versions"("id") ON DELETE SET NULL
  `);
}

type AudioVersion = {
  id: string;
  r2_key: string;
  label: string;
  note: string | null;
  uploaded_by: string | null;
  created_at: Date | null;
};

type SongRow = {
  id: string;
  title: string;
  audio_url: string | null;
  created_by: string | null;
  created_at: Date | null;
};

/**
 * One song's history, as one transaction.
 *
 * **Every upload becomes a take. Exactly one version is created.**
 *
 * That asymmetry is the whole design of this backfill, and it is worth being
 * clear about why, because the obvious alternative -- one version per upload
 * -- is wrong in a way that is hard to undo.
 *
 * song_audio_versions records uploads, not promotions. We know which take is
 * current *now*, from songs.audio_url. We do not know which takes were ever
 * current before, and there is no column that would tell us. A song in the
 * real database has three takes with the *second* one current: somebody
 * uploaded a take after the chosen one and it was never promoted.
 *
 * Turning each of those three uploads into a version would invent a history
 * nobody lived, and worse: it would put a version in the log that was never
 * main. The next real commit copies from the current version, so the log would
 * read v1 -> v2 -> v3 -> v4 while v4 actually descends from v2. That is
 * precisely the branch the flat-copy model exists to prevent, imported into
 * the history on day one.
 *
 * So: one version, holding the take that is current. The others stay in the
 * slot as takes -- label, note, uploader and date all intact, nothing deleted,
 * all of them still playable and promotable. The song reads "Full mix: 3
 * takes, version 1 uses Version 2", which is exactly what is true.
 *
 * Every id is generated here rather than by the database, because db.batch()
 * has to know all its statements up front -- the same reason the real commit
 * path in the app generates its version id in code.
 */
async function backfillSong(song: SongRow, audioVersions: AudioVersion[]) {
  const stemId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const statements: BatchStatement[] = [];

  statements.push(
    db.insert(song_stems).values({
      id: stemId,
      song_id: song.id,
      name: MIX_STEM_NAME,
      kind: MIX_KIND,
      sort_order: 0,
      created_by: song.created_by,
      // As old as the song, not as old as this script.
      created_at: song.created_at ?? new Date(),
    }),
  );

  const takes = audioVersions.map((audioVersion) => ({
    id: crypto.randomUUID(),
    source: audioVersion,
    // Backdated to the take, not to now: a log that lies about its own age is
    // worse than no log. Same reasoning as add-song-audio-versions.ts.
    when: audioVersion.created_at ?? song.created_at ?? new Date(),
  }));

  for (const take of takes) {
    statements.push(
      db.insert(song_stem_takes).values({
        id: take.id,
        song_id: song.id,
        stem_id: stemId,
        r2_key: take.source.r2_key,
        label: take.source.label,
        note: take.source.note,
        format: "mp3",
        uploaded_by: take.source.uploaded_by,
        created_at: take.when,
      }),
    );
  }

  const matched = takes.find((take) => take.source.r2_key === song.audio_url);

  // The old pointer named a key no take holds. Rather than leave the song with
  // no current version -- a silent player, for a song that plays fine today --
  // fall back to the newest take and say so at the end of the run.
  const current = matched ?? takes[takes.length - 1];
  const others = takes.length - 1;

  statements.push(
    db.insert(song_versions).values({
      id: versionId,
      song_id: song.id,
      version_number: 1,
      // What the band called this take. The number is new; the name is theirs.
      label: current.source.label,
      note:
        others > 0
          ? `Where the song stood when stems arrived. The ${others} earlier ` +
            `${others === 1 ? "take is" : "takes are"} kept in ${MIX_STEM_NAME}.`
          : "Where the song stood when stems arrived.",
      created_by: current.source.uploaded_by,
      created_at: current.when,
    }),
    db.insert(song_version_stems).values({
      song_version_id: versionId,
      song_id: song.id,
      stem_id: stemId,
      take_id: current.id,
    }),
    db
      .update(songs)
      .set({ current_version_id: versionId })
      .where(eq(songs.id, song.id)),
  );

  await db.batch(statements as [BatchStatement, ...BatchStatement[]]);

  return {
    takes: takes.length,
    current: current.source.label,
    fellBack: !matched,
  };
}

async function main() {
  if (dryRun) {
    console.log("--dry: nothing will be written\n");
  } else {
    await createTables();
    console.log("stem tables and songs.current_version_id are present\n");
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

  let migrated = 0;
  let skipped = 0;
  let empty = 0;
  const fallbacks: string[] = [];

  for (const song of allSongs) {
    const audioVersions = await db.query.song_audio_versions.findMany({
      where: (versions, { eq }) => eq(versions.song_id, song.id),
      orderBy: asc(sql`created_at`),
    });

    if (audioVersions.length === 0) {
      // No audio was ever uploaded. It gets its first stem the first time
      // somebody uploads one -- there is nothing to carry across.
      empty++;
      continue;
    }

    if (!dryRun) {
      const existing = await db.query.song_stems.findFirst({
        where: (stems, { eq }) => eq(stems.song_id, song.id),
      });

      if (existing) {
        console.log(`skipped "${song.title}" — already has stems`);
        skipped++;
        continue;
      }
    }

    if (dryRun) {
      const current = audioVersions.find(
        (version) => version.r2_key === song.audio_url,
      );

      console.log(
        `would migrate "${song.title}": 1 stem (${MIX_STEM_NAME}), ` +
          `${audioVersions.length} take(s), 1 version — using ` +
          `${current ? `"${current.label}"` : "NEWEST TAKE (audio_url matched nothing)"}`,
      );

      if (!current) fallbacks.push(song.title);
      migrated++;
      continue;
    }

    const result = await backfillSong(song, audioVersions);

    console.log(
      `migrated "${song.title}" — ${result.takes} take(s) into ${MIX_STEM_NAME}, ` +
        `version 1 uses "${result.current}"` +
        (result.fellBack ? "  [fell back to newest]" : ""),
    );

    if (result.fellBack) fallbacks.push(song.title);
    migrated++;
  }

  console.log(
    `\n${allSongs.length} songs: ${migrated} ${dryRun ? "to migrate" : "migrated"}, ` +
      `${skipped} already done, ${empty} with no audio to carry across`,
  );

  if (fallbacks.length > 0) {
    console.log(
      `\nWorth a look — audio_url matched no version, so current_version_id ` +
        `fell back to the newest take:\n` +
        fallbacks.map((title) => `  - ${title}`).join("\n"),
    );
  }
}

void main();
