/**
 * One-off backfill: gives every existing user a URL handle.
 *
 * users.handle was added after the table already had rows, so it is nullable
 * and existing users have none. This fills them in, oldest row first so the
 * longest-standing account keeps the bare handle and later namesakes take the
 * numeric suffix.
 *
 * Run with:  npx tsx scripts/backfill-user-handles.ts
 * Add --dry to print the plan without touching the database.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { slugify, isReservedSlug } from "@/lib/slug";

const dryRun = process.argv.includes("--dry");

async function main() {
  const allUsers = await db.query.users.findMany({
    columns: { id: true, username: true, handle: true },
  });

  if (allUsers.length === 0) {
    console.log("No users found. Nothing to do.");
    return;
  }

  // Existing handles stay reserved even for rows we are not touching.
  const taken = new Set(
    allUsers
      .map((user) => user.handle)
      .filter((handle): handle is string => Boolean(handle)),
  );

  const plan: { id: string; username: string; handle: string }[] = [];

  for (const user of allUsers) {
    if (user.handle) continue;

    const base = slugify(user.username);
    let candidate = base;

    if (isReservedSlug(candidate) || taken.has(candidate)) {
      let suffix = 2;
      while (taken.has(`${base}-${suffix}`)) suffix++;
      candidate = `${base}-${suffix}`;
    }

    taken.add(candidate);
    plan.push({ id: user.id, username: user.username, handle: candidate });
  }

  console.log(`${allUsers.length} users, ${plan.length} need a handle.`);

  for (const change of plan) {
    console.log(`  ${change.username} -> ${change.handle}`);
  }

  if (plan.length === 0) return;

  if (dryRun) {
    console.log("\n--dry given, no changes written.");
    return;
  }

  // No two-pass dance needed here: every row being written currently has NULL,
  // so the new values cannot collide with an existing one.
  for (const change of plan) {
    await db
      .update(users)
      .set({ handle: change.handle })
      .where(eq(users.id, change.id));
  }

  console.log(`\nDone. ${plan.length} handles written.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  });
