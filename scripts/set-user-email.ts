/**
 * Changes the email on an account, keeping everything else it owns.
 *
 * There is no route for this: updateUserSchema does not accept an email, on
 * purpose, since changing a login identifier is not a profile edit. This is
 * the deliberate way to do it.
 *
 * Emails are UNIQUE, so freeing an address means moving the account holding it
 * rather than deleting that account -- reversible, and its bands, invitations
 * and history come along.
 *
 * Run with:  npx tsx scripts/set-user-email.ts <current-email> <new-email>
 * Add --dry to see what would change without writing.
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const [current, next] = args.filter((arg) => !arg.startsWith("--"));

async function main() {
  if (!current || !next) {
    console.error(
      "Usage: npx tsx scripts/set-user-email.ts <current-email> <new-email> [--dry]",
    );
    process.exitCode = 1;
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, current),
    columns: { id: true, username: true, email: true, handle: true },
    with: {
      band_members: {
        columns: { role: true, status: true },
        with: { band: { columns: { band_name: true } } },
      },
    },
  });

  if (!user) {
    console.error(`No account with the email ${current}`);
    process.exitCode = 1;
    return;
  }

  const taken = await db.query.users.findFirst({
    where: eq(users.email, next),
    columns: { username: true, email: true },
  });

  if (taken) {
    console.error(
      `${next} is already used by ${taken.username}. Move that account first.`,
    );
    process.exitCode = 1;
    return;
  }

  // Printed before writing, so the account being changed is recognisable and
  // not just an address that looked right.
  console.log(`${user.username} (handle: ${user.handle})`);
  for (const membership of user.band_members) {
    console.log(`  ${membership.band.band_name} — ${membership.role} (${membership.status})`);
  }
  if (user.band_members.length === 0) console.log("  no bands");

  if (dryRun) {
    console.log(`\n--dry: would change ${current} → ${next}`);
    return;
  }

  await db.update(users).set({ email: next }).where(eq(users.id, user.id));

  console.log(`\n${current} → ${next}`);
}

void main();
