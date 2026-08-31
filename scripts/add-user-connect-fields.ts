/**
 * One-off: gives a user a country and a signup date, so Connect can filter and
 * sort on something other than the name.
 *
 * The plan for Connect assumed both already existed. They did not -- `country`
 * is on `bands`, not on `users`, and `users` never had a `created_at` at all.
 * Everything else Connect needs was already there: `users.tags` is the
 * instrument/skill vocabulary and needs no new table (see
 * docs/decisions/connect-directory.md).
 *
 * Both columns are nullable-by-default and optional in the UI. A directory you
 * can filter by instrument *and* location is a sharper instrument than a list
 * of names, so location stays something a person chooses to publish rather than
 * something the schema demands.
 *
 * About the created_at backfill: Postgres fills existing rows with the DEFAULT
 * at the moment of the ALTER, so every account that predates this script shares
 * one timestamp. "Newest first" therefore cannot order them among themselves,
 * which is why the directory query sorts created_at DESC, username ASC -- the
 * tiebreaker is what stops those rows shuffling between pages of the same
 * result set.
 *
 * The two indexes are the reason the directory can filter server-side without
 * reading the whole table: GIN over the tags array serves the `&&` overlap
 * test, and created_at serves the default sort.
 *
 * Safe to run twice: ADD COLUMN IF NOT EXISTS and CREATE INDEX IF NOT EXISTS.
 *
 * Run with:  npx tsx scripts/add-user-connect-fields.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";

const dryRun = process.argv.includes("--dry");

async function migrate() {
  // cca2, the same two-letter code bands.country holds, so one countryOptions
  // list off world-countries renders both.
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text
  `);

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now()
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_tags_idx" ON "users" USING gin ("tags")
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" ("created_at")
  `);
}

async function main() {
  const before = await db.execute(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE cardinality(tags) > 0)::int AS tagged
      FROM "users"
  `);

  const { total, tagged } = before.rows[0] as { total: number; tagged: number };

  console.log(
    `\n${total} users, ${tagged} of them with at least one tag.\n` +
      `All ${total} get today's date as created_at and a null country.\n`,
  );

  if (dryRun) {
    console.log("--dry: would add users.country and users.created_at, plus a");
    console.log("       GIN index on tags and a btree on created_at.");
    return;
  }

  await migrate();

  const after = await db.execute(sql`
    SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
     WHERE table_name = 'users'
       AND column_name IN ('country', 'created_at')
     ORDER BY column_name
  `);

  console.table(after.rows);
  console.log("users is ready for Connect.\n");
}

void main();
