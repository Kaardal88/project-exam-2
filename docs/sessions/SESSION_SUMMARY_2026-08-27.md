# Session Summary

Stems and version control, built end to end across two PRs: #30 (schema, API,
the first studio, and the rename to StemLock) and #31 (the overdub loop,
version naming, the version switcher, and comments that know their version).

The organising question was not "how do we store several audio files" but
**"what is a version, and who gets to decide what the song is"**. Almost every
decision below falls out of the answer.

## 1. A version is a commit on main

The obvious framing was git branching — main is the song, contributions are
branches called "rhythm guitar v1". That is the wrong shape. Branching means
two versions living side by side waiting to be merged; this is one sequence of
states of the whole arrangement, which in git terms is a commit history on main
with **no branches at all**. "Rhythm guitar v1" is not a branch, it is a commit
message.

`songs.current_version_id` is main. Restoring an older version writes a *new*
version rather than moving the pointer backwards, the same shape as
`git revert`, and that is what keeps the log a straight line.

**A version is a flat, independent copy, written at commit time.** Creating v2
copies v1's rows — pointers, not audio — and overwrites only the slot that
changed. The alternative, resolving a missing slot by walking up to a parent,
would mean fixing a stem in v1 changes what an already approved v4 sounds like.

**Uploading a take is not committing a version.** Anyone with project access
hands one in and nothing audible changes; only a band leader moves main. That
is the same split `song_audio_versions` was built on, and it stays one click
for the common case — the upload form's "put it in the song now" box is checked
by default for a leader and absent for a guest.

**One finished mp3 is a song with one stem.** No simple mode and no advanced
mode, which was the single most valuable simplification: versions, comments,
downloads and history all behave identically either way.

## 2. Three things the database taught us

**`db.transaction()` throws on neon-http.** The whole write-time copy rests on
that copy being atomic, so this was probed before anything was built.
`db.batch()` works, and `scripts/probe-batch.ts` confirms a failure partway
rolls the whole thing back. It also showed `<> ALL(array)` does not bind on
this driver — which in the end did not matter, because `commitVersion()` has
to read the previous rows anyway and writes the resulting arrangement out in
full instead.

**`RESTRICT` became `NO ACTION`, and it was not cosmetic.** Both refuse a
delete; `RESTRICT` checks immediately, `NO ACTION` at end of statement.
Deleting a song cascades into three stem tables at once, so under `RESTRICT`
the check fired against rows the same statement was about to remove. **It
passed when tested** — by luck of the order the constraints happened to be
created in, which would have made deleting a song, project or band a coin flip
on any rebuilt database. Found by `scripts/probe-stems-flow.ts`, which is kept
as the runnable check of the commit path.

**The circular foreign key broke TypeScript, not Postgres.** `songs` points at
`song_versions` and back again; without an explicit `: AnyPgColumn` return type
both tables collapse to `any` and the damage reaches files with nothing to do
with stems.

## 3. The backfill said only what it knew

`song_audio_versions` records **uploads, not promotions**. We know which take is
current now; we do not know which were ever current before, and no column would
say.

A real song here had three takes with the *second* one current — somebody
uploaded after the chosen one and it was never promoted, which is the
contribute-versus-decide split working. Turning those three uploads into three
versions would have invented a history nobody lived and put a version in the log
that was never main. So: **one version per song, holding the current take**, and
the others stay takes with label, note, uploader and date intact.

The comments migration had the same shape and needed no guessing at all —
existing comments keep their timestamp and get a null version, which is exactly
what they were.

## 4. Playback is one clock

Several `<audio>` elements each keep their own clock and drift audibly apart
within a chorus. One `AudioContext` gives every source a single sample-accurate
clock, which is the only way separate files stay in time.

What follows: every stem decodes up front, seeking stops and restarts every
source, and memory is the real limit — decoded PCM is duration × sample rate ×
channels × 4 bytes, so a four-minute stereo stem is ~40MB **whatever the mp3
weighed**. `MAX_STEMS_PER_VERSION = 12` exists for that, and is not to be
raised because the files turned out small.

Mute and solo came out nearly free, as predicted: one gain node per lane. That
turned out to matter more than expected — muting your own guitar and bouncing
gives you a backing track to record it against.

## 5. The download was for the wrong person

It was built with a mix engineer in mind. The real user is a band member
overdubbing at home: download the latest version, open it in a DAW, play a solo
over it, render that track alone, upload it back. That needs a **guide track**,
not a pile of parts — so the manifest returns both, and `lib/bounce.ts` makes
one for a song that has no single file, rendering in the browser with
`OfflineAudioContext` and `lamejs`.

**The filenames never arrived.** `getDownloadUrl` signed the key without a
`Content-Disposition`, and the object is on another origin, so `download` on
the link was ignored and `01_Drums_v7.mp3` landed as a uuid. Seven stems named
after uuids are no use to anybody.

## 6. What only using it revealed

Every one of these came from a real song on screen. None was findable by
reading the code:

- **PATCH was never exported** from `app/api/[[...route]]/route.ts`. Renaming
  and recolouring a stem looked correct, were mounted correctly, and were
  unreachable — Next.js answered 405 before Hono saw the request.
- **A song came out with four lanes all called "Clean guitar"**, because the
  name field was optional behind a placeholder and the take label right after
  it was required. The real names went to the box that insisted.
- **Locking a version explained itself only after somebody pressed it and
  asked what happened.** A control whose whole effect is a refusal that may
  never come has to say so where it is used.
- **A stems-only song had a silent dashboard player**, because `audio_url` is
  null with no mix slot — for exactly the songs the feature exists for.
- **Selecting an older version left the lanes it excludes stuck at
  "decoding…"** forever, waiting for audio that was never coming.
- **The upload form spent a paragraph explaining stems to people who export
  stems.** Replaced with the one number that catches a truncated file.
- **Clicking a dashboard comment scrolled to a row still folded away.** The tab
  only mounts when it becomes active, so it mounted with the focus signal
  already set and compared it equal to itself.

## 7. Comments got two axes, not one

`song_version_id` and `timestamp_seconds` are both nullable and **independent**,
which turns "song or version?" into four shapes that are all used: a note about
the song, a moment in the song whatever the version, a moment in one version,
and one version as a whole. The last is the one a mix engineer reaches for and
the easiest to overlook.

The UI is GitHub's: comments on an earlier version fold away rather than
disappear, with one button — "Still an issue → v9" — to carry a live one
forward. Not automatic, because a comment about a take that has since been
replaced usually *is* resolved.

## Things worth knowing next time

- **Every HTTP method must be re-exported from the route file.** This is now in
  `CLAUDE.md`, because the failure mode is silent and looks like a bug in the
  route.
- **Two Hono routers share `/songs`.** They must never define the same path —
  the first registered wins silently. The legacy `/versions` routes were moved
  aside to `/audio-versions` for exactly this, then deleted with the old panel.
- **PR #30 was merged mid-session without the branch being closed**, so ten
  commits accumulated with no open PR and `gh pr edit` silently failed against
  a merged one. Check `state` before editing a PR.
- `song_audio_versions` is still there and read by nothing. It stays as the
  ground truth behind the backfill until the new tables have carried real use.
- **The app is StemLock now.** `docs/` and `CLAUDE.md` are updated; the repo is
  still `project-exam-2`, and `NEXT_PUBLIC_APP_NAME` is worth setting on the
  deploy.

## Left for later

Named in the decision records rather than forgotten: WAV masters behind a
subscription plan with an MP3 proxy (the columns exist); a real zip of a
version's stems, which needs a queue this stack does not have; comments
attached to a **stem** rather than the song, which is probably worth more to a
band than the version axis; and the one comment shape with no entry point yet —
a timestamped comment on an *older* version.
