/**
 * One-off probe for docs/decisions/stems-and-versioning.md section 4.7.
 *
 * Committing a song version copies the previous version's stem rows and
 * overwrites the slots that changed. That has to be atomic: a half-copied
 * version is a version that lies about what the song sounds like. But
 * server/db/index.ts uses drizzle-orm/neon-http, and that driver has no
 * interactive transactions -- db.transaction() throws.
 *
 * The proposed way through is db.batch(), which Neon runs as a single
 * transaction over HTTP. This probe answers the four questions the real
 * implementation depends on, before any of it is written:
 *
 *   1. does db.batch() accept db.execute(sql`...`) items at all?
 *   2. does INSERT ... SELECT work inside a batch?
 *   3. how does an array parameter bind, for the "every slot except these"
 *      exclusion? Two candidate forms are tried.
 *   4. is a failing batch actually rolled back?
 *
 * Touches nothing real. It creates two throwaway tables prefixed
 * _batch_probe_, shaped like song_versions and song_version_stems, and drops
 * them again in a finally block.
 *
 * Run with:  npx tsx scripts/probe-batch.ts
 * Add --keep to leave the probe tables behind for inspection.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

const keep = process.argv.includes("--keep");

const results: { name: string; ok: boolean; detail: string }[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}\n      ${detail}\n`);
}

/** The three slots of the starting version. */
const stemA = crypto.randomUUID();
const stemB = crypto.randomUUID();
const stemC = crypto.randomUUID();
const v1 = crypto.randomUUID();

async function setup() {
  await db.execute(sql`DROP TABLE IF EXISTS "_batch_probe_stem"`);
  await db.execute(sql`DROP TABLE IF EXISTS "_batch_probe_version"`);

  await db.execute(sql`
    CREATE TABLE "_batch_probe_version" (
      "id" uuid PRIMARY KEY,
      "n" integer NOT NULL UNIQUE
    )
  `);

  // The UNIQUE mirrors song_version_stems: one active take per slot per
  // version, enforced by Postgres rather than by application code.
  await db.execute(sql`
    CREATE TABLE "_batch_probe_stem" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "version_id" uuid NOT NULL
        REFERENCES "_batch_probe_version"("id") ON DELETE CASCADE,
      "stem_id" uuid NOT NULL,
      "take_id" uuid NOT NULL,
      UNIQUE ("version_id", "stem_id")
    )
  `);

  await db.execute(
    sql`INSERT INTO "_batch_probe_version" ("id", "n") VALUES (${v1}, 1)`,
  );

  for (const stem of [stemA, stemB, stemC]) {
    await db.execute(sql`
      INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
      VALUES (${v1}, ${stem}, ${crypto.randomUUID()})
    `);
  }
}

async function countStems(versionId: string) {
  const result = await db.execute(
    sql`SELECT count(*)::int AS c FROM "_batch_probe_stem" WHERE "version_id" = ${versionId}`,
  );
  return Number((result.rows[0] as { c: number }).c);
}

async function versionExists(versionId: string) {
  const result = await db.execute(
    sql`SELECT count(*)::int AS c FROM "_batch_probe_version" WHERE "id" = ${versionId}`,
  );
  return Number((result.rows[0] as { c: number }).c) > 0;
}

/**
 * Test 1 + 2 + 3a: the real commit shape in one batch, with the exclusion
 * written as `<> ALL(${array}::uuid[])`.
 */
async function testCommitWithAllArray() {
  const v2 = crypto.randomUUID();
  const touched = [stemB];
  const newTake = crypto.randomUUID();

  try {
    await db.batch([
      db.execute(sql`
        INSERT INTO "_batch_probe_version" ("id", "n")
        VALUES (${v2}, (SELECT COALESCE(MAX("n"), 0) + 1 FROM "_batch_probe_version"))
      `),
      db.execute(sql`
        INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
        SELECT ${v2}, "stem_id", "take_id"
          FROM "_batch_probe_stem"
         WHERE "version_id" = ${v1}
           AND "stem_id" <> ALL(${touched}::uuid[])
      `),
      db.execute(sql`
        INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
        VALUES (${v2}, ${stemB}, ${newTake})
      `),
    ]);
  } catch (error) {
    record(
      "batch + INSERT...SELECT + <> ALL(array)",
      false,
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  const copied = await countStems(v2);

  record(
    "batch + INSERT...SELECT + <> ALL(array)",
    copied === 3,
    `v2 has ${copied} slots, expected 3 (two inherited, one overwritten)`,
  );
}

/**
 * Test 3b: the same exclusion written as NOT IN with the ids expanded one by
 * one, in case the array parameter above does not bind. Kept separate so a
 * failure names which form is the problem.
 */
async function testCommitWithNotIn() {
  const v3 = crypto.randomUUID();
  const touched = [stemC];
  const newTake = crypto.randomUUID();

  const exclusion = sql.join(
    touched.map((id) => sql`${id}::uuid`),
    sql`, `,
  );

  try {
    await db.batch([
      db.execute(sql`
        INSERT INTO "_batch_probe_version" ("id", "n")
        VALUES (${v3}, (SELECT COALESCE(MAX("n"), 0) + 1 FROM "_batch_probe_version"))
      `),
      db.execute(sql`
        INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
        SELECT ${v3}, "stem_id", "take_id"
          FROM "_batch_probe_stem"
         WHERE "version_id" = ${v1}
           AND "stem_id" NOT IN (${exclusion})
      `),
      db.execute(sql`
        INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
        VALUES (${v3}, ${stemC}, ${newTake})
      `),
    ]);
  } catch (error) {
    record(
      "batch + INSERT...SELECT + NOT IN (expanded)",
      false,
      error instanceof Error ? error.message : String(error),
    );
    return;
  }

  const copied = await countStems(v3);

  record(
    "batch + INSERT...SELECT + NOT IN (expanded)",
    copied === 3,
    `v3 has ${copied} slots, expected 3`,
  );
}

/**
 * Test 4, and the one that actually matters: a batch that fails partway must
 * leave nothing behind. If the version row survives, db.batch() is not a
 * transaction and the whole write-time copy model needs a different driver.
 */
async function testAtomicity() {
  const vBad = crypto.randomUUID();
  const take = crypto.randomUUID();

  let threw = false;

  try {
    await db.batch([
      db.execute(sql`
        INSERT INTO "_batch_probe_version" ("id", "n") VALUES (${vBad}, 999)
      `),
      db.execute(sql`
        INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
        VALUES (${vBad}, ${stemA}, ${take})
      `),
      // Same (version_id, stem_id) as the row above: violates the UNIQUE and
      // must take the two statements before it down with it.
      db.execute(sql`
        INSERT INTO "_batch_probe_stem" ("version_id", "stem_id", "take_id")
        VALUES (${vBad}, ${stemA}, ${take})
      `),
    ]);
  } catch {
    threw = true;
  }

  const survived = await versionExists(vBad);
  const orphans = await countStems(vBad);

  record(
    "a failing batch rolls back",
    threw && !survived && orphans === 0,
    threw
      ? survived || orphans > 0
        ? `NOT ATOMIC -- version row survived: ${survived}, orphan stem rows: ${orphans}`
        : "the batch threw and wrote nothing"
      : "the batch did not even throw on a UNIQUE violation",
  );
}

async function cleanup() {
  if (keep) {
    console.log("--keep: _batch_probe_version and _batch_probe_stem left behind\n");
    return;
  }

  await db.execute(sql`DROP TABLE IF EXISTS "_batch_probe_stem"`);
  await db.execute(sql`DROP TABLE IF EXISTS "_batch_probe_version"`);
  console.log("probe tables dropped\n");
}

async function main() {
  console.log("\nProbing db.batch() on drizzle-orm/neon-http\n");

  try {
    await setup();
    await testCommitWithAllArray();
    await testCommitWithNotIn();
    await testAtomicity();
  } finally {
    await cleanup();
  }

  const failed = results.filter((result) => !result.ok);

  if (failed.length === 0) {
    console.log("All probes passed. Section 4.7 holds: build on db.batch().");
    return;
  }

  console.log(
    `${failed.length} of ${results.length} probes failed:\n` +
      failed.map((result) => `  - ${result.name}`).join("\n"),
  );
  process.exitCode = 1;
}

void main();
