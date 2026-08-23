/**
 * One-off: adds users.is_admin, the index that allows only one admin, and the
 * feedback table.
 *
 * Written by hand rather than generated, for the reason recorded in
 * scripts/add-song-audio-versions.ts: the snapshot in drizzle/ is from the
 * first migration and the schema has drifted well past it, so generate and
 * push both want to reconcile that drift against a database with real data.
 *
 * Safe to run twice. Nothing here is granted to anyone -- becoming admin is a
 * separate, deliberate act in scripts/grant-admin.ts.
 *
 * Run with:  npx tsx scripts/add-feedback.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

const dryRun = process.argv.includes("--dry");

const statements: { what: string; run: () => Promise<unknown> }[] = [
  {
    what: "users.is_admin, defaulting to false for everyone",
    run: () =>
      db.execute(sql`
        ALTER TABLE "users"
          ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false
      `),
  },
  {
    what: "the index that makes a second admin impossible",
    run: () =>
      db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_single_admin_idx"
          ON "users" ("is_admin") WHERE "is_admin" = true
      `),
  },
  {
    what: "the feedback table",
    run: () =>
      db.execute(sql`
        CREATE TABLE IF NOT EXISTS "feedback" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "author_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
          "category" varchar(20) NOT NULL,
          "body" text NOT NULL,
          "page" varchar(255),
          "status" varchar(20) NOT NULL DEFAULT 'new',
          "reply" text,
          "replied_at" timestamp,
          "created_at" timestamp DEFAULT now()
        )
      `),
  },
  {
    what: "feedback.reply_seen_at, so an answered item can stop being new",
    run: () =>
      db.execute(sql`
        ALTER TABLE "feedback"
          ADD COLUMN IF NOT EXISTS "reply_seen_at" timestamp
      `),
  },
  {
    what: "an index for 'my own submissions', the tester's view",
    run: () =>
      db.execute(sql`
        CREATE INDEX IF NOT EXISTS "feedback_author_id_idx"
          ON "feedback" ("author_id")
      `),
  },
];

async function main() {
  if (dryRun) {
    console.log("--dry: nothing will be written\n");
    for (const statement of statements) console.log(`would add ${statement.what}`);
    return;
  }

  for (const statement of statements) {
    await statement.run();
    console.log(`added ${statement.what}`);
  }

  const admins = await db.query.users.findMany({
    where: eq(users.is_admin, true),
    columns: { id: true },
  });

  console.log(`\ndone — ${admins.length} admin(s) exist. Grant one with:`);
  console.log("  npx tsx scripts/grant-admin.ts <email>");
}

void main();
