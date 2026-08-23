/**
 * Makes one account the platform admin, which means one thing: reading the
 * tester feedback inbox. It grants no access to anyone's bands, projects or
 * files.
 *
 * This script is the only way to set the flag. No API route writes it, no zod
 * schema accepts it, and no button anywhere offers it -- so the path runs
 * through someone with the database URL, deliberately.
 *
 * The database allows only one admin (users_single_admin_idx), so granting to
 * a second account fails rather than quietly succeeding. Move it with --revoke
 * first if that is really what you want.
 *
 * Run with:  npx tsx scripts/grant-admin.ts <email>
 *            npx tsx scripts/grant-admin.ts <email> --revoke
 *            npx tsx scripts/grant-admin.ts --who
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const who = args.includes("--who");
const email = args.find((arg) => !arg.startsWith("--"));

async function currentAdmin() {
  return db.query.users.findFirst({
    where: eq(users.is_admin, true),
    columns: { id: true, username: true, email: true },
  });
}

async function main() {
  const existing = await currentAdmin();

  if (who) {
    console.log(
      existing
        ? `admin: ${existing.username} <${existing.email}>`
        : "no admin is set",
    );
    return;
  }

  if (!email) {
    console.error("Usage: npx tsx scripts/grant-admin.ts <email> [--revoke]");
    process.exitCode = 1;
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, username: true, email: true, is_admin: true },
  });

  if (!user) {
    console.error(`No account with the email ${email}`);
    process.exitCode = 1;
    return;
  }

  if (revoke) {
    await db
      .update(users)
      .set({ is_admin: false })
      .where(eq(users.id, user.id));

    console.log(`revoked admin from ${user.username} <${user.email}>`);
    return;
  }

  if (user.is_admin) {
    console.log(`${user.username} <${user.email}> is already the admin`);
    return;
  }

  // Checked here so the failure is a sentence rather than a unique-constraint
  // violation. The index is still what actually enforces it.
  if (existing) {
    console.error(
      `${existing.username} <${existing.email}> is already the admin.\n` +
        `Only one admin can exist. Revoke that one first:\n` +
        `  npx tsx scripts/grant-admin.ts ${existing.email} --revoke`,
    );
    process.exitCode = 1;
    return;
  }

  await db.update(users).set({ is_admin: true }).where(eq(users.id, user.id));

  console.log(`${user.username} <${user.email}> is now the admin`);
}

void main();
