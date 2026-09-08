/**
 * Read-only: for one account, prints what a delete would take with it -- the
 * bands that would go, the bands that would change hands, and the work whose
 * attribution would drop to null. Writes nothing.
 *
 * Run with:  npx tsx scripts/probe-accounts.ts <email> [<email> ...]
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  users,
  bands,
  projects,
  songs,
  song_comments,
  song_files,
  song_tasks,
  song_notes,
  song_audio_versions,
  song_stem_takes,
  feedback,
} from "@/server/db/schema";
import { getAccountDeletionPlan } from "@/server/users/users.service";

const owned = [
  ["bands created", bands, bands.created_by],
  ["projects created", projects, projects.created_by],
  ["songs created", songs, songs.created_by],
  ["comments written", song_comments, song_comments.author_id],
  ["files uploaded", song_files, song_files.uploaded_by],
  ["tasks assigned", song_tasks, song_tasks.assignee_id],
  ["notes published", song_notes, song_notes.published_by],
  ["audio versions", song_audio_versions, song_audio_versions.uploaded_by],
  ["stem takes", song_stem_takes, song_stem_takes.uploaded_by],
  ["feedback sent", feedback, feedback.author_id],
] as const;

async function report(email: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, username: true, handle: true, is_admin: true },
  });

  console.log(`\n=== ${email} ===`);

  if (!user) {
    console.log("no such account");
    return;
  }

  console.log(`${user.username}  @${user.handle}  ${user.id}${user.is_admin ? "  ADMIN" : ""}`);

  const plan = await getAccountDeletionPlan(user.id);

  console.log(plan.length === 0 ? "  bands: none" : "  bands:");
  for (const band of plan) {
    const successor =
      "successor" in band && band.successor
        ? ` -> ${(band.successor as { username: string }).username}`
        : "";
    console.log(`    ${band.outcome.toUpperCase().padEnd(11)} ${band.band_name}${successor}`);
  }

  for (const [label, table, column] of owned) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(eq(column, user.id));

    if (row.n > 0) console.log(`  ${String(row.n).padStart(4)}  ${label}`);
  }
}

async function main() {
  const emails = process.argv.slice(2).filter((a) => !a.startsWith("--"));

  if (emails.length === 0) {
    console.error("Usage: npx tsx scripts/probe-accounts.ts <email> [<email> ...]");
    process.exitCode = 1;
    return;
  }

  for (const email of emails) await report(email);
}

main();
