# Stems and version control

**Decided 2026-08-24. Not built yet — this is the plan of record.**

A song version stops being one finished mixdown and becomes a set of separate
stems played back together. A new contribution — a guest vocalist's take, a
re-recorded rhythm guitar — is added as a new version without re-uploading
anything else. A mix engineer can pull the stems of one version back out.

This document is the decisions, and the reasons for them. Where it disagrees
with the earlier planning notes, it says so and why.

---

## 1. Versions are commits on main, not branches

The obvious framing was git branching: "main" is the song, and each
contribution is a branch called "rhythm guitar v1" or "vocal ref 2". That is
the wrong shape. Branching means two versions living side by side that will
later be merged. What is actually happening here is one sequence of states of
the whole arrangement — in git terms, a commit history on main with no
branches at all. **"Rhythm guitar v1" is not a branch. It is a commit message.**

So the vocabulary maps like this:

| Git | BandStructure | In the database |
| --- | --- | --- |
| `main` / HEAD | the song as it stands | `songs.current_version_id` |
| a commit | one layer added to the arrangement | a row in `song_versions` |
| the commit message | "Vocal ref 2" | `song_versions.label` |
| the hash | v7 | `song_versions.version_number` |
| the working tree | takes uploaded but not yet in the song | `song_stem_takes` |
| `git revert` | "go back to v5" = a **new** v9 copying v5 | a new row; history stays straight |

The number does not go away, it just stops being the headline. The UI leads
with the label and prints the number small, the way GitHub leads with the
commit message and prints the hash small.

**The rule that keeps this linear: a new version always copies from
`current_version_id`, never from an arbitrary version.** Building on v5 while
v7 is main would produce two siblings — a branch nobody asked for, and the
chain problem section 3 exists to prevent. Restoring an old version therefore
writes a new version rather than moving the pointer backwards.

---

## 2. Uploading a take is not committing a version

`song_audio_versions` was built to separate two acts that used to be one:
contributing a take, and deciding what the song is. A guest musician who
cannot hand in what they played is no use to anybody; a guest musician who can
silently overrule the band is worse. Stems must not undo that.

So:

- **Uploading a take** writes a row in `song_stem_takes` and nothing else.
  Anyone with project access, guests included. Nothing audible changes.
  *(`git add`)*
- **Committing a version** copies the previous version's rows, overwrites the
  slots that changed, and moves `songs.current_version_id`. **`band_leader`
  only.** *(`git commit` to main)*

This is the same split, and the same permission line, that every other route
in the song dashboard already draws: `getProjectAccess()` answers with
`isLeader`, and everything is `band_leader` versus everyone else.

**It is not two steps for the common case.** The upload form carries a "make
this the song now" checkbox, checked by default for a leader and absent for a
guest. A solo artist uploading a finished song clicks once. The model stays
whole; the friction does not reach the person who does not need it.

---

## 3. A version is a flat copy, written at commit time

A version is an independent, flat set of stem references. Creating v2 copies
v1's list of active takes — copies of pointers, not of audio — and overwrites
only the one slot that changed.

**This must happen on write** (`INSERT ... SELECT` from the previous version's
rows, then the changed rows), **not on read.** Resolving a missing slot by
walking up to a parent version recreates the chain problem: fixing a stem in
v1 would then change what v2, v3 and v4 sound like, including a mix somebody
has already signed off on.

The audio itself is still shared across versions by reference. Only the small
pointer rows are duplicated per version, so this costs nothing in storage.

Removing a layer is not a delete: it is a commit that omits that slot.

---

## 4. Schema

Conventions taken from the existing schema: `song_` prefix, uuid primary keys,
snake_case, nullable `*_by` with `onDelete: "set null"` so history survives an
account deletion, `varchar` with an explicit length for any vocabulary that
lives in `lib/`.

### 4.1 `lib/stemKinds.ts`

The planning notes suggested mapping stems onto an existing role concept.
There is not one to map onto: `lib/bandRoles.ts` is only `band_leader` and
`member`, and `lib/collaboratorRoles.ts` is deliberately labels for what
someone is doing on a project, not what instrument they play. Stems get their
own vocabulary, following the `bandRoles.ts` pattern — validated on the server,
rendered on the client, one file so the two cannot drift.

```ts
export const stemKinds = [
  { value: "drums",      label: "Drums",         defaultColor: "#22d3ee" },
  { value: "bass",       label: "Bass",          defaultColor: "#facc15" },
  { value: "rhythm_gtr", label: "Rhythm guitar", defaultColor: "#15803d" },
  { value: "lead_gtr",   label: "Lead guitar",   defaultColor: "#ef4444" },
  { value: "clean_gtr",  label: "Clean guitar",  defaultColor: "#f97316" },
  { value: "vocals",     label: "Vocals",        defaultColor: "#f472b6" },
  { value: "keys",       label: "Keys",          defaultColor: "#a78bfa" },
  { value: "synth",      label: "Synth",         defaultColor: "#60a5fa" },
  { value: "percussion", label: "Percussion",    defaultColor: "#2dd4bf" },
  { value: "fx",         label: "FX",            defaultColor: "#94a3b8" },
  { value: "mix",        label: "Full mix",      defaultColor: "#fef9c3" },
  { value: "other",      label: "Other",         defaultColor: "#a3a3a3" },
] as const;
```

The default colors are the conventions the author already works to in a DAW.
`mix` is the slot that makes "just upload the finished song" work without a
second mode anywhere in the product.

### 4.2 `song_stems` — the slots

One row per instrument/role slot in the song. A registry of names and colors;
it does not say what is in the arrangement. That is the version's job.

```ts
export const song_stems = pgTable("song_stems", {
  id: uuid("id").defaultRandom().primaryKey(),
  song_id: uuid("song_id").notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  /** "Lead vocal", "Gtr L" -- the band's own name for the slot */
  name: varchar("name", { length: 80 }).notNull(),

  /** see lib/stemKinds.ts -- drives the icon and the default color */
  kind: varchar("kind", { length: 40 }).notNull(),

  /**
   * #rrggbb chosen by the band. Null means "use the kind's default", so a
   * stem always has a color without anyone having had to pick one.
   */
  color: varchar("color", { length: 7 }),

  sort_order: integer("sort_order").notNull().default(0),

  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at").defaultNow(),
}, (t) => ({
  bySong: index("song_stems_song_id_idx").on(t.song_id),
}));
```

No UNIQUE on `(song_id, name)`. Two similarly named slots are confusing, not
broken, and a band should be able to rename freely.

### 4.3 `song_stem_takes` — the audio

```ts
export const song_stem_takes = pgTable("song_stem_takes", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Denormalised from the stem. Every route checks "does this belong to this
  // song" before acting, and every other song_* table carries song_id for
  // exactly that reason.
  song_id: uuid("song_id").notNull()
    .references(() => songs.id, { onDelete: "cascade" }),
  stem_id: uuid("stem_id").notNull()
    .references(() => song_stems.id, { onDelete: "cascade" }),

  /** always songs/<song_id>/stems/... -- passes isKeyForSong() unchanged */
  r2_key: text("r2_key").notNull(),

  label: varchar("label", { length: 255 }).notNull(),
  note: text("note"),

  /**
   * Format-agnostic from day one even though validation only admits mp3.
   * Adding wav later is then a validation change, not a schema change.
   */
  format: varchar("format", { length: 10 }).notNull().default("mp3"),
  duration_seconds: integer("duration_seconds"),
  sample_rate: integer("sample_rate"),
  bit_depth: integer("bit_depth"),
  byte_size: integer("byte_size"),

  /**
   * The compressed proxy the player always uses. Null while the master is
   * already mp3, which is everything in this round. When wav arrives behind a
   * plan: the master stays in r2_key, a proxy is generated asynchronously
   * into this column, and playback reads proxy_r2_key ?? r2_key. Downloading
   * for mix always reads r2_key.
   */
  proxy_r2_key: text("proxy_r2_key"),

  uploaded_by: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at").defaultNow(),
}, (t) => ({
  bySong: index("song_stem_takes_song_id_idx").on(t.song_id),
  byStem: index("song_stem_takes_stem_id_idx").on(t.stem_id),
}));
```

**Deviation from the planning notes.** They proposed the proxy as a
self-referencing `proxy_take_id` to a second take row. A proxy that is its own
row turns up in every "takes in this slot" list and has to be filtered out
everywhere. As a column it is just another key for the same audio: two columns
against one self-reference plus a filter in every query.

### 4.4 `song_versions` — the commits

```ts
export const song_versions = pgTable("song_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  song_id: uuid("song_id").notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  version_number: integer("version_number").notNull(),

  /** "Vocal ref 2" -- what a reader actually sees. The number is the hash. */
  label: varchar("label", { length: 255 }).notNull(),
  note: text("note"),

  /**
   * Sent to mix. A timestamp and an actor rather than a boolean flag -- the
   * same shape as song_comments.resolved_at and feedback.replied_at, and it
   * carries who and when for free.
   */
  locked_at: timestamp("locked_at"),
  locked_by: uuid("locked_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqueNumber: unique().on(t.song_id, t.version_number),
}));
```

No separate `song_id` index: the UNIQUE on `(song_id, version_number)` has
`song_id` leftmost and already serves "the versions of this song".

### 4.5 `song_version_stems` — the flat snapshot

The most-read table in the feature, and the one that enforces the model.

```ts
export const song_version_stems = pgTable("song_version_stems", {
  id: uuid("id").defaultRandom().primaryKey(),

  song_version_id: uuid("song_version_id").notNull()
    .references(() => song_versions.id, { onDelete: "cascade" }),

  song_id: uuid("song_id").notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  stem_id: uuid("stem_id").notNull()
    .references(() => song_stems.id, { onDelete: "restrict" }),

  /**
   * RESTRICT, not cascade and not set null. A take some version points at
   * cannot be deleted, because deleting it would change what an already
   * approved mix sounds like -- the exact thing section 3 exists to prevent.
   * The route checks first and answers 409 with an explanation; this is the
   * backstop under it. A snapshot row with a hole in it is worse than a
   * refusal: it is history that quietly changed.
   */
  take_id: uuid("take_id").notNull()
    .references(() => song_stem_takes.id, { onDelete: "restrict" }),
}, (t) => ({
  /** one active take per slot per version, enforced by Postgres */
  oneTakePerSlot: unique().on(t.song_version_id, t.stem_id),

  /** "does any version point at this take?" -- run on every take deletion */
  byTake: index("song_version_stems_take_id_idx").on(t.take_id),
}));
```

**Deviation from the planning notes**, which asked for an index on `song_id`
here. The UNIQUE covers the hot read, and no query filters on `song_id` alone.
Since every stem upload is a write into these tables and every index has a
write cost — the notes' own argument — the column stays and the index waits
until something actually needs it.

### 4.6 `songs.current_version_id` — this is `main`

```ts
current_version_id: uuid("current_version_id")
  .references(() => song_versions.id, { onDelete: "set null" }),
```

Circular foreign key (`songs` → `song_versions` → `songs`). Postgres is fine
with it, but the migration must create `song_versions` **before** adding the
column to `songs`.

**`songs.audio_url` stays**, as a cache of the mix slot's take in the current
version — nullable, written only inside the commit function. The claim in
`architecture.md` that "which one is current is derived" still holds: this is
derivable, it is just materialised in one place so a song list does not need a
join, and so the SEO/OG work later has something to read. A song with stems
and no mix slot has `audio_url` null, and single-file consumers show "stems
only" rather than a broken player.

### 4.7 The transaction — verified, it holds

`server/db/index.ts` uses `drizzle-orm/neon-http`. **That driver has no
interactive transactions** — `db.transaction()` throws. The copy has to be
atomic or a version can be left half-copied, which is a version that lies
about what the song sounds like.

The way through: generate the version id in code with `crypto.randomUUID()`
instead of relying on `defaultRandom()`, so every statement is known up front,
and send them as one `db.batch([...])` — Neon runs an HTTP batch as a single
transaction.

**Probed against the real database before anything else was built**
(`scripts/probe-batch.ts`, two throwaway tables shaped like `song_versions`
and `song_version_stems`, dropped again afterwards). Results:

| Question | Answer |
| --- | --- |
| Does `db.batch()` accept `db.execute(sql...)` items? | **Yes** |
| Does `INSERT ... SELECT` work inside a batch? | **Yes** — two slots inherited, one overwritten, as intended |
| Does a failing batch roll back? | **Yes** — a UNIQUE violation in the third statement left nothing at all behind, version row included |
| Does `<> ALL(${array}::uuid[])` bind? | **No** — `malformed array literal`. The http driver does not send a JS array as a Postgres array |

So the model stands, with one correction to the SQL below: **the exclusion is
written as `NOT IN` with the ids expanded one per parameter**, via
`sql.join(ids.map((id) => sql\`${id}::uuid\`), sql\`, \`)`. The array form does
not work on this driver.

Two things that follow from `NOT IN` and need guarding in the route:

- `NOT IN ()` with an empty list is a syntax error. A real commit always
  touches at least one slot, but the clause must be omitted rather than
  emitted empty.
- **`NOT IN` returns no rows at all if any value in the list is NULL.** A
  malformed request carrying a null `stem_id` would silently inherit nothing
  and produce a version with only the changed slot in it — a quietly emptied
  arrangement rather than an error. Validate the ids as non-null uuids before
  building the list.

The copy itself:

```sql
-- 1. the new commit
INSERT INTO song_versions (id, song_id, version_number, label, created_by)
VALUES ($new, $song,
        (SELECT COALESCE(MAX(version_number), 0) + 1
           FROM song_versions WHERE song_id = $song),
        $label, $user);

-- 2. inherit everything that did not change -- on WRITE, not on read.
--    NOT IN with the ids expanded one per parameter; the array form does
--    not bind on neon-http. Omit the clause entirely if nothing is touched.
INSERT INTO song_version_stems (song_version_id, song_id, stem_id, take_id)
SELECT $new, song_id, stem_id, take_id
  FROM song_version_stems
 WHERE song_version_id = $current
   AND stem_id NOT IN ($touched1::uuid, $touched2::uuid, ...);

-- 3. the slots that did change, and only those
INSERT INTO song_version_stems (song_version_id, song_id, stem_id, take_id)
VALUES ...;

-- 4. move main
UPDATE songs
   SET current_version_id = $new, audio_url = $mixKey, updated_at = now()
 WHERE id = $song;
```

Dropping a layer means naming the slot in `$touchedStemIds` and not inserting
a replacement row in step 3. There is no separate delete path.

---

## 5. Endpoints

All under the existing Hono app, all behind `requireAuth` +
`getSongContext()` + `getProjectAccess()` like the rest of the song routes.

`server/songs/songs.routes.ts` is already 1194 lines. These live in
**`server/songs/stems.routes.ts`**, mounted with
`songsRoutes.route("/", stemsRoutes)`, or the file passes 2000.

### Slots

| Route | Who | Notes |
| --- | --- | --- |
| `GET /songs/:id/stems` | access | the registry: name, kind, color, order |
| `POST /songs/:id/stems` | access | new slot |
| `PATCH /songs/:id/stems/:stemId` | access | name, color, `sort_order`. Color validated `/^#[0-9a-f]{6}$/i` |
| `DELETE /songs/:id/stems/:stemId` | leader | 409 if any version references it |

### Takes

| Route | Who | Notes |
| --- | --- | --- |
| `POST /songs/:id/presign-upload` | access | add `target: "stem"` → `songs/<id>/stems/<uuid>.mp3` |
| `GET /songs/:id/stems/:stemId/takes` | access | takes in one slot |
| `POST /songs/:id/stems/:stemId/takes` | **access, guests included** | registers an uploaded take. Changes nothing audible |
| `GET /songs/:id/takes/:takeId/url` | access | signed URL, resolving `proxy_r2_key ?? r2_key` |
| `DELETE /songs/:id/takes/:takeId` | uploader or leader | 409 if a version references it |

### Versions

| Route | Who | Notes |
| --- | --- | --- |
| `GET /songs/:id/versions` | access | the history. `is_current` **derived** from `songs.current_version_id`, never stored twice |
| `GET /songs/:id/versions/:versionId` | access | **one request: every stem plus its signed URL** |
| `POST /songs/:id/versions` | **leader** | commit. Body `{ label, note, stems: [{ stem_id, take_id \| null }] }` — only what changed |
| `PUT /songs/:id/versions/:versionId/restore` | leader | writes a **new** version copying that one; history stays straight |
| `PUT` / `DELETE /songs/:id/versions/:versionId/lock` | leader | sets/clears `locked_at` + `locked_by` |
| `DELETE /songs/:id/versions/:versionId` | leader | 409 on current, 409 on locked |
| `GET /songs/:id/versions/:versionId/download` | access | see section 8 |

**`GET /songs/:id/versions/:versionId` returning every signed URL at once is
not an optimisation, it is a requirement.** The existing player fetches one URL
per version from `/versions/:id/url`; repeating that shape per stem is ten
round trips before a single note plays.

`PUT /songs/:id` still rejects `audio_url` outright, now naming
`POST /songs/:id/versions` as the route that does the job.

### R2 keys

Stem keys are `songs/<songId>/stems/<uuid>.mp3` and proxies
`songs/<songId>/stems/<uuid>-proxy.mp3`. Both pass `isKeyForSong()` unchanged,
which is the point: **any new key path must go through that check rather than
alongside it.** `UPLOAD_TARGETS` in the presign route gains `"stem"`, and the
mp3-only validation already there applies untouched.

---

## 6. Playback: Web Audio, one context

One `AudioContext`, each stem decoded to an `AudioBuffer` via
`decodeAudioData`, every source started against the same `currentTime` plus an
offset. `computeWaveformPeaks()` in `MediaPlayer.tsx` already does the decode
half of this — build on it rather than starting again.

Two consequences to design for rather than discover:

- **Seeking means stopping and restarting every source with a new offset.**
  Buffer sources cannot be sought.
- **Memory is real.** A decoded 4-minute stereo stem is roughly 40 MB. Ten
  stems is roughly 400 MB in the browser.

**The cap is 12 stems per version**, as a named constant from the start. Easy
to raise, painful to introduce afterwards.

Worth writing down, because the intuition runs the other way: **a quiet
single-guitar stem is a small file and exactly as large decoded.** Decoded PCM
is `duration × sample rate × channels × 4 bytes`; the mp3 compression is gone
the moment `decodeAudioData` returns. A 4-minute stereo stem occupies about
40 MB whether the mp3 was 3 MB or 9 MB. The cap is about duration and channel
count, not upload size — so it should not be raised on the grounds that the
files turned out small.

Decoding ten files also takes seconds, not milliseconds. That needs per-lane
progress, not one global spinner.

The payoff: with Web Audio in place, per-track mute and solo is almost free —
one `GainNode` per stem — so the player UI is designed with them from the
start rather than retrofitted.

---

## 7. Stem colors are data, not palette

Bands set their own color per stem. This is worth doing now, while the
surrounding code is open: one column, one validation, one small popover.

**No color-picker dependency.** `<input type="color">` is a real color picker —
the operating system's own, with a color map, an eyedropper and a hex field, in
every browser — and `components/ui/popover.tsx` (Radix) already exists. The
control is a swatch button on each stem card opening a popover with the twelve
presets from `lib/stemKinds.ts` plus a "Custom colour…" that opens the native
picker. If an in-page HSV picker is ever wanted, `react-colorful` (2.8 kB, no
dependencies) is the one — but that is an upgrade, not a starting point.

**This does not break the "reuse existing Tailwind colors" rule in
`CLAUDE.md`.** Stem colors are data: user-chosen hex stored in a row and
rendered as an inline `style`, never as a Tailwind class. The chrome around
them stays `yellow-100` and `neutral`. Only the lane accent is the band's color.

**Use the color as an accent only** — a left edge bar on the lane, the waveform
fill, a dot in the version list. Never as a text color. A band that picks
`#1a1a2e` on a dark background would otherwise make its own stem unreadable.

---

## 8. Zip is deferred, and the endpoint is shaped so it can arrive later

The planning notes call for an asynchronous job: queue, build the zip, park it
in R2, hand back an expiring link. That is the right design. **There is no
queue in this stack** — Vercel, Neon and R2, and nothing else. Standing one up
is its own piece of work, plausibly larger than everything else here.

| | Approach | Cost | Risk |
| --- | --- | --- | --- |
| **A** | `GET .../download` returns a manifest: filenames plus signed URLs; the client downloads them in sequence as `01_Drums_v7.mp3`, `02_Bass_v7.mp3`, … | no new infrastructure, no new dependency | the engineer gets ten files, not one archive |
| **B** | A Hono route streaming a real zip: pull each R2 object, pipe through `client-zip` (3 kB, Web Streams), return the `Response`. **Store, not deflate** — mp3 does not compress, so it streams instead of buffering | one small dependency | Vercel's function timeout; a dropped connection starts over |
| **C** | The asynchronous job as originally planned | Cloudflare Queues, a Worker, a second deploy target | large, and only really needed once WAV exists |

**A now. B if testers actually ask for a single file. C when WAV lands.** The
endpoint keeps its name either way, so the implementation can be replaced
without touching the client or the model.

Downloading is otherwise nearly free: presigned per-file download already
exists, and a mix engineer invited as a `project_collaborator` already resolves
through `getProjectAccess()`. No new access model.

---

## 9. Studio is a tab, not a bigger overlay

Today's expanded player is an absolute overlay inside the dashboard column,
`max-w-6xl`, centred against the viewport. Widening it produces a larger
overlay, not a workspace.

**"Open player" navigates to a Studio tab**, alongside Dashboard, Comments,
Lyrics, Notes and Files in `SongTabs`. That gives full dashboard width for
free, without the overlay's compromises: scroll, header, sidebar and tabs all
survive, it can be linked to directly, and it is the natural home for the stem
lanes, the version history and the download panel. It also matches the
reference points — GitHub and a DAW are both panelled workspaces, not modals.

```
┌─ lanes ──────────────────────────────────┬─ history ──────────┐
│ ▌Drums    [S][M] ▁▃█▅▂▇▃▁▅█▃▂  [■]  ⋮   │ ● Vocal ref 2  v7  │
│ ▌Bass     [S][M] ▂▅▃█▁▄▇▂▅▃█▁  [■]  ⋮   │ │ Rhythm gtr…  v6  │
│ ▌Vocals   [S][M] ▁▁▄█▇▃▁▂▆█▄▂  [■]  ⋮   │ │ Drums moved  v5 🔒│
│ + Add stem                               │                    │
├──────────────────────────────────────────┤ [ New version ]    │
│  ▶  00:42 ─────●──────────── 03:18  🔊   │ [ Download stems ] │
└──────────────────────────────────────────┴────────────────────┘
```

A colored left edge per lane. `[S]`/`[M]` are solo and mute.

### One screen, not two products

Plenty of bands have never heard the word "stems", and must not have to. There
is no simple mode and no advanced mode — there is one empty state with two
buttons and a sentence explaining the difference:

> **No audio here yet.**
> *Got one finished file?* → **Upload the song** — makes a "Full mix" slot,
> and that is all there is to it.
> *Got separate tracks out of your DAW?* → **Upload stems** — guitar, vocals,
> drums as their own files, played together.

Both land in the same model. The first is a song with one stem.

### Mobile

"Expand player" is missing on mobile because the button is `hidden … sm:flex`
in `MediaPlayer.tsx` — a decision that no longer holds. Alongside the Web Audio
rewrite, which touches the whole component anyway:

- the waveform gets its own full-width row above the controls, instead of being
  squeezed between two timestamps in the same flex row
- controls sit centred underneath, with clear separation between play/pause and
  volume on one side and "Open player" on the other
- the volume slider is `hidden sm:block` today and comes back on mobile
- closing is an ✕ icon, not the words "Collapse player"

---

## 10. Migration

A hand-written, idempotent `scripts/add-song-stems.ts` with a `--dry` flag,
following `add-song-audio-versions.ts` exactly. **Not `drizzle-kit generate`
or `push`** — the snapshot in `drizzle/` is still the initial migration while
the schema has drifted far past it, so both want to reconcile that whole drift
against a database holding real data.

The backfill is the good part: **the existing audio history becomes the mix
slot's takes.** For every song that has audio:

1. a `song_stems` row named "Full mix", kind `mix`
2. one `song_stem_takes` row per existing `song_audio_versions` row —
   `r2_key`, `label`, `note`, `uploaded_by` and `created_at` carried over
   unchanged, and backdated to the take rather than to now, because a log that
   lies about its own age is worse than no log
3. **exactly one** `song_versions` row, holding the take whose `r2_key`
   matches `songs.audio_url`
4. one `song_version_stems` row pointing at that take
5. `songs.current_version_id` set to that version

### Every upload becomes a take. Only one version is created.

The first draft of this said one version per upload, and the real data showed
why that is wrong. **`song_audio_versions` records uploads, not promotions.**
We know which take is current now, from `songs.audio_url`. We do not know which
takes were ever current before, and no column would tell us.

One song in the database has three takes with the **second** one current —
somebody uploaded a take after the chosen one and it was never promoted, which
is the contribute-versus-decide split working exactly as designed. Turning
those three uploads into three versions would invent a history nobody lived,
and put a version in the log that was never main. The next real commit copies
from the current version, so the log would read v1 → v2 → v3 → v4 while v4
actually descends from v2 — **the branch this whole model exists to prevent,
imported into the history on day one.**

So the other takes stay takes: label, note, uploader and date intact, nothing
deleted, all still playable and promotable. That song reads "Full mix: 3 takes,
version 1 uses Version 2", which is what is true. The cost is that one song
shows one version instead of three; the gain is that every version in the log
really was main, which is the assumption everything downstream rests on.

Assuming instead that everything before the current take had been promoted in
turn is also a guess — just a more flattering one. Rejected on the same
grounds.

If `audio_url` matches no take at all, the version falls back to the newest
take and the script names the song at the end of the run, rather than leaving
it with no current version and a silent player.

Nothing in the new UI reads `song_audio_versions` afterwards, but **it is not
dropped in this round.** It stays as the ground truth in case the backfill
turns out to be wrong. A separate script drops it later, once the new tables
have carried real use.

---

## 11. Out of scope, and known risks

**Out of scope, deliberately:**

- Synchronised realtime playback between several users at once.
- A retention policy for old takes and versions. Flagged as a real cost risk
  once WAV arrives, but not decided now.
- WAV upload itself. The schema carries `format`, `sample_rate`, `bit_depth`
  and `proxy_r2_key` from the start so that adding it is a validation change
  behind a subscription plan, not a schema change.

**Known risks:**

- ~~**`db.batch()` (section 4.7) is unproven here.**~~ Probed and confirmed on
  2026-08-24, including rollback on failure. The one correction it forced is
  in section 4.7: `NOT IN` rather than `<> ALL(array)`.
- **Comments are timestamped against the song, not against a take.** The
  player already hides comment markers while previewing an older version for
  this reason. Stems of differing lengths make the question larger. The likely
  answer is a nullable `song_comments.song_version_id` in a later round; it is
  not being touched now.
- **Takes no version points at are the real garbage.** Each commit duplicates
  pointer rows, not audio, so versions are cheap. Orphaned takes are not, and
  they will not be once WAV exists.
