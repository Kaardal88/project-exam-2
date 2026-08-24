/**
 * End-to-end check of the commit path, on a song it creates and deletes again.
 *
 * This project has no test framework, and the commit path is the one piece of
 * this feature where a mistake is invisible until somebody's approved mix
 * quietly changes. So it gets a runnable check instead of an argument: that a
 * new version inherits the slots it did not touch, that editing a take in v3
 * leaves v2 alone, that a null take_id drops a slot, that restoring writes a
 * new version rather than moving main backwards, and that a take some version
 * uses cannot be deleted.
 *
 * The last check is the one that changed the schema. Deleting a song cascades
 * into song_stems, song_stem_takes and song_version_stems in one statement,
 * and ON DELETE RESTRICT is checked immediately -- so it fired against rows
 * the same statement was about to remove, and whether deleting a song, a
 * project or a band worked at all came down to the order Postgres happened to
 * fire constraints in. NO ACTION checks at the end of the statement instead:
 * same refusal, no ordering luck.
 *
 * Writes to the real database and cleans up after itself in a finally block.
 * If the last line does not say the probe song was deleted, delete it by hand.
 *
 * npx tsx scripts/probe-stems-flow.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { songs, song_stems, song_stem_takes } from "@/server/db/schema";
import { commitVersion, getArrangement } from "@/server/songs/versions.service";

const results: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  console.log(results[results.length - 1]);
}

async function main() {
  const project = await db.query.projects.findFirst();
  if (!project) throw new Error("no project to attach a probe song to");

  const [song] = await db
    .insert(songs)
    .values({ project_id: project.id, title: "__stems probe__" })
    .returning();

  console.log(`probe song ${song.id}\n`);

  try {
    // Two slots: a mix and a guitar.
    const [mix] = await db
      .insert(song_stems)
      .values({ song_id: song.id, name: "Full mix", kind: "mix", sort_order: 0 })
      .returning();

    const [gtr] = await db
      .insert(song_stems)
      .values({ song_id: song.id, name: "Lead guitar", kind: "lead_gtr", sort_order: 1 })
      .returning();

    const mkTake = async (stemId: string, label: string) =>
      (
        await db
          .insert(song_stem_takes)
          .values({
            song_id: song.id,
            stem_id: stemId,
            r2_key: `songs/${song.id}/stems/${crypto.randomUUID()}.mp3`,
            label,
          })
          .returning()
      )[0];

    const mixTake = await mkTake(mix.id, "Mix take 1");
    const gtrTake1 = await mkTake(gtr.id, "Gtr take 1");
    const gtrTake2 = await mkTake(gtr.id, "Gtr take 2");

    // v1: mix only
    let current = (await db.query.songs.findFirst({ where: eq(songs.id, song.id) }))!;
    const v1 = await commitVersion({
      song: current,
      userId: song.created_by ?? (await db.query.users.findFirst())!.id,
      label: "First mix",
      note: null,
      changes: [{ stem_id: mix.id, take_id: mixTake.id }],
    });
    check("v1 commits", v1.ok, v1.ok ? `v${v1.version.version_number}, ${v1.stemCount} stem` : v1.error);
    if (!v1.ok) return;

    current = (await db.query.songs.findFirst({ where: eq(songs.id, song.id) }))!;
    check("current_version_id moved", current.current_version_id === v1.version.id);
    check("audio_url is the mix take", current.audio_url === mixTake.r2_key);

    // v2: add the guitar. The mix slot must be inherited, not lost.
    const v2 = await commitVersion({
      song: current,
      userId: current.created_by ?? (await db.query.users.findFirst())!.id,
      label: "Lead guitar in",
      note: null,
      changes: [{ stem_id: gtr.id, take_id: gtrTake1.id }],
    });
    check("v2 commits", v2.ok, v2.ok ? `${v2.stemCount} stems` : (v2 as { error: string }).error);
    if (!v2.ok) return;
    check("v2 inherited the mix slot", v2.stemCount === 2);

    // The flat-copy guarantee: v1 must be untouched.
    const v1rows = await getArrangement(v1.version.id);
    check(
      "v1 still has exactly its own one stem",
      v1rows.length === 1 && v1rows[0].take_id === mixTake.id,
      `${v1rows.length} row(s)`,
    );

    // v3: swap the guitar take. v2 must not follow.
    current = (await db.query.songs.findFirst({ where: eq(songs.id, song.id) }))!;
    const v3 = await commitVersion({
      song: current,
      userId: current.created_by ?? (await db.query.users.findFirst())!.id,
      label: "Better gtr",
      note: null,
      changes: [{ stem_id: gtr.id, take_id: gtrTake2.id }],
    });
    if (!v3.ok) return check("v3 commits", false, v3.error);

    const v2rows = await getArrangement(v2.version.id);
    check(
      "changing a take in v3 did not change v2",
      v2rows.find((r) => r.stem_id === gtr.id)?.take_id === gtrTake1.id,
    );

    // Dropping a slot.
    current = (await db.query.songs.findFirst({ where: eq(songs.id, song.id) }))!;
    const v4 = await commitVersion({
      song: current,
      userId: current.created_by ?? (await db.query.users.findFirst())!.id,
      label: "Guitar out",
      note: null,
      changes: [{ stem_id: gtr.id, take_id: null }],
    });
    check("a null take_id drops the slot", v4.ok && v4.stemCount === 1);

    // Restore v3: a NEW version, not a pointer move.
    current = (await db.query.songs.findFirst({ where: eq(songs.id, song.id) }))!;
    const restored = await commitVersion({
      song: current,
      userId: current.created_by ?? (await db.query.users.findFirst())!.id,
      label: 'Back to "Better gtr"',
      note: null,
      changes: [],
      baseVersionId: v3.version.id,
    });
    check(
      "restore writes a new version, keeping history linear",
      restored.ok &&
        restored.version.id !== v3.version.id &&
        restored.version.version_number === 5,
      restored.ok ? `v${restored.version.version_number}` : "",
    );
    check("restore brought the guitar back", restored.ok && restored.stemCount === 2);

    // A take some version uses must not be deletable.
    let restrictHeld = false;
    try {
      await db.delete(song_stem_takes).where(eq(song_stem_takes.id, mixTake.id));
    } catch {
      restrictHeld = true;
    }
    check("a take a version uses cannot be deleted", restrictHeld);

    // A commit that changes nothing is refused.
    current = (await db.query.songs.findFirst({ where: eq(songs.id, song.id) }))!;
    const noop = await commitVersion({
      song: current,
      userId: current.created_by ?? (await db.query.users.findFirst())!.id,
      label: "nothing",
      note: null,
      changes: [],
    });
    check("an empty commit is refused", !noop.ok);
  } finally {
    // The real question: does deleting a song still work now that
    // song_version_stems holds RESTRICT references into its own cascade tree?
    try {
      await db.delete(songs).where(eq(songs.id, song.id));
      check("deleting the song cascades cleanly", true);
    } catch (error) {
      check(
        "deleting the song cascades cleanly",
        false,
        error instanceof Error ? error.message.split("\n")[0] : String(error),
      );
      console.log(`\n!! probe song ${song.id} was NOT deleted`);
    }
  }

  const failed = results.filter((r) => r.startsWith("FAIL"));
  console.log(
    failed.length === 0
      ? "\nAll probes passed."
      : `\n${failed.length} failed.`,
  );
  if (failed.length) process.exitCode = 1;
}

void main();
