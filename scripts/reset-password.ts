/**
 * Sets a new password for an account, for when a tester locks themselves out.
 *
 * There is no reset flow in the app: no verification email, no "forgot
 * password" link. For a closed round with five testers that is a reasonable
 * place to be, but it means a forgotten password has no path back except this
 * one. Ten minutes of script beats a tester sitting out the round.
 *
 * A password is generated rather than taken as an argument, so it never lands
 * in shell history, and so nobody is tempted to reuse one they use elsewhere.
 * Read it out of the terminal and send it to the person over whatever channel
 * you already use with them.
 *
 * Known gap: there is no change-password route yet, so whoever receives this
 * keeps it. That is worth fixing before anyone outside a test round signs up.
 *
 * Run with:  npx tsx scripts/reset-password.ts <email>
 */

import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";

const email = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

/**
 * Three short words plus digits: long enough to be safe, short enough to read
 * over the phone without spelling out punctuation.
 */
function generatePassword() {
  const words = [
    "amp", "reverb", "snare", "tempo", "chorus", "bridge", "verse", "fader",
    "cymbal", "octave", "phaser", "tremolo", "riff", "sustain", "gain",
  ];

  const pick = () => words[randomBytes(1)[0] % words.length];
  const digits = String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4, "0");

  return `${pick()}-${pick()}-${pick()}-${digits}`;
}

async function main() {
  if (!email) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email>");
    process.exitCode = 1;
    return;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, username: true, email: true },
  });

  if (!user) {
    console.error(`No account with the email ${email}`);
    process.exitCode = 1;
    return;
  }

  const password = generatePassword();

  // The same hashing registration uses -- imported rather than reimplemented,
  // so this cannot drift into writing something login will not accept.
  await db
    .update(users)
    .set({ password_hash: await hashPassword(password) })
    .where(eq(users.id, user.id));

  console.log(`\nNew password for ${user.username} <${user.email}>:\n`);
  console.log(`  ${password}\n`);
  console.log("Send it to them, and remember there is no way for them to");
  console.log("change it themselves yet.");
}

void main();
