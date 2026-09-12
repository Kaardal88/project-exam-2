# Architecture

## Tech stack

- Next.js (App Router) / React
- TypeScript
- Tailwind CSS v4
- Hono API, mounted as a single Next.js route handler
- Neon Postgres
- Drizzle ORM
- Zod
- Cloudflare R2 for audio, artwork and project files
- JWT auth in an httpOnly cookie

## Shape

The whole API is one Hono app behind `app/api/[[...route]]/route.ts`. Domains
live in `server/<domain>/`, each with its routes and, where the logic is worth
naming, a service or resolver beside them.

`lib/` holds anything shared between client and server — role and status
vocabularies, slug rules, the upload helper. When a set of values is validated
on the server and rendered on the client, it belongs there and nowhere else, so
the two cannot drift. `lib/bandRoles.ts` is the pattern the others follow.

## Auth

**The session is a JWT in an httpOnly `bs_session` cookie**, attached by the
browser to same-origin requests. It is not reachable from JavaScript, which is
the point of it.

- **Never add an `Authorization` header.** There is no code path that reads one.
- **Never read the session from JavaScript.** The client answers "am I signed
  in?" from a 401, not from local state.
- `bs_signed_in` is a second cookie carrying `1` and no secret. The landing
  nav, the feedback button and `HomeLink` (the wordmark on pages without the
  navbar) read it through `useSignedInHint()` to decide what to draw before any
  request returns. **It is a rendering hint with no authority** — forging it
  changes what a link looks like and nothing else.
- Login and register send a signed-in visitor on to `/user` with
  `useRedirectIfSignedIn()`, which asks `/api/auth/me` rather than trusting the
  hint: a stale hint would bounce between `/user` and `/login` forever.
- `SameSite=Lax` is the CSRF defence: the cookie is withheld from cross-site
  POST/PUT/DELETE, which is every route that changes anything. That is why
  logout is a POST rather than a link.
- `Secure` is bound to `NODE_ENV`, so production gets it without anyone
  remembering.

Changing a password does not end sessions on other devices. A stateless JWT can
only be invalidated by storing a token version and reading it on every
authenticated request, which is a round trip per call on a serverless database.
The limitation is stated in the route and to the user rather than hidden.

There is **no password reset and no email verification**. Both need an email
provider and a verified sending domain, so they are one piece of work, not two.
`scripts/reset-password.ts` is the stand-in.

## Access model

Two resolvers answer every question about who may do what. Neither is
duplicated in a route.

- **`server/bands/membership.ts`** — is this user in this band, and as what.
  A pending invitation is an offer, not access.
- **`server/projects/access.ts`** — may this user work on this project, and as
  what. A project guest resolves here without belonging to the band at all.

**Every permission check is `band_leader` versus everyone else.** That is
deliberate: guests hold member-level rights inside a project until there is a
reason to narrow them. It does mean a new role added to `lib/bandRoles.ts`
grants member-level access by default rather than none.

`lib/collaboratorRoles.ts` values are **labels, not permissions**. They drive
display and grouping. When a restriction is wanted, it hangs off that value in
one place.

Guards worth knowing: `isLastLeader()` refuses to leave a band with no leader,
because every management route is gated on `band_leader` and there would be
nobody left who could appoint one. The audio version log refuses to delete the
current take for the same shape of reason.

## Connect and invitations

**Every invitation starts on `/users` (Connect).** The band profile's "Add
member" is a link, not a modal: `/users?inviteFor=<bandId>`.

- Without `inviteFor`, Connect is a directory and no card offers anything.
- With it, the page checks `role === "band_leader"` from `GET /bands/:id`
  before drawing an Invite button. That is display only —
  `POST /bands/:id/members` and `POST /projects/:id/collaborators` each check
  leadership themselves, as they always did.
- **Choosing a guest role reveals a project picker**, because a guest is a row
  in `project_collaborators` and belongs to one project, not to the band. There
  is no such thing as a guest of a band, and the modal says so rather than
  guessing a project.

`GET /users` is a query, not a table dump: `q`, `tags`, `roles`, `country`,
`sort`, `limit`, `offset` and `band_id`, resolved in
`server/users/users.directory.ts` and returning `{ users, total, hasMore }`.
The limit is clamped server-side. Unknown filter values are rejected rather
than ignored — a chip the reader believes is narrowing the list must never
quietly do nothing.

`lib/connectFilters.ts` holds the filter and sort vocabulary, following the
`lib/bandRoles.ts` pattern. The role filter is **derived**: it is the union of
`bandRoles` and `collaboratorRoles`, each tagged with the table it lives in,
and resolves to a subquery over that table. Nothing stores "this person is a
band leader".

`users.tags` stays a `text[]` over the closed `lib/userTags.ts` vocabulary
rather than becoming a join table — filtered with `&&` against a GIN index.
`users.country` and `users.created_at` were added for the location filter and
the default sort; see `docs/decisions/connect-directory.md`, which also records
what was deliberately left out.

## The two directories

`/users` (Connect) and `/bands` (Artists) are the same idea pointed at
different tables, and are deliberately built alike: a `lib/*Filters.ts`
vocabulary shared with the client, a `server/<domain>/*.directory.ts` that owns
the query, `{ rows, total, hasMore }` out, chips for closed vocabularies and a
select for countries, twelve per page behind "Load more", and unknown filter
values rejected rather than ignored.

Three differences, each of them a decision rather than drift:

- **Artists is unauthenticated.** `GET /bands/public` takes no session, so
  `eq(visibility, PUBLIC_VISIBILITY)` is prepended to every query in
  `buildWhere()` and no parameter can turn it off. Putting that check in the
  route would let a second caller forget it.
- **Artists shows its grid immediately; Connect waits to be asked.** Listing
  every person by default is a wall and a privacy question. Listing every
  public band is what the page is for.
- **`sort=random`** exists only for bands, powering "Show me something new" and
  the landing page's four featured bands. It is in `bandSorts` so validation
  stays in one place and marked `hidden` so it never reaches the sort menu — a
  randomly ordered list cannot be paged, because `ORDER BY random()` re-rolls
  per query and page two would be a fresh shuffle rather than a continuation.

Band search is **name only** — searching bios makes "folk" match a band that
wrote "for the folk at the back". See `docs/decisions/band-directory.md`.

## Files and R2

Uploads are presigned. The browser asks `POST /songs/:id/presign-upload`, gets
a URL, and PUTs the file to R2 directly.

Stems land under `songs/<songId>/stems/`, which is the same prefix rule and so
needs no new validation — any future key path must go *through* `isKeyForSong`
rather than alongside it.

**A download URL carries its own filename.** `getDownloadUrl` takes an optional
`filename` and signs it into `ResponseContentDisposition`. Without it the file
saves as the R2 key — a uuid — because the object is on another origin and a
`download` attribute on the link is ignored cross-origin.

**Keys are always scoped `songs/<songId>/…`, and that is checked on the way
back in.** `getDownloadUrl` signs whatever key it is handed and `deleteObject`
deletes whatever key it is handed — neither asks who owns the object. Since
every presigned URL contains the key it signs, an unvalidated key from a
request body is a request to read or destroy any object in the bucket. See
`isKeyForSong()` in `server/r2.ts`, and use it on **any** new path that accepts
a key.

## Stems and versions

A song is layers. `song_stems` is the slot registry — one row per lane, with
the band's name for it and its colour. `song_stem_takes` is the audio: every
file anyone has handed in for a slot. `song_versions` is the history, and
`song_version_stems` says which take was in which slot in which version.

**A version is a commit on main, not a branch.** `songs.current_version_id` is
main. Each version holds its own complete set of rows, copied from the previous
one **at write time** and overwriting only the slot that changed — so
correcting a take in v1 can never change what an already approved v4 sounds
like. Restoring an older version writes a *new* version rather than moving the
pointer backwards, which is what keeps the log a straight line.

**Uploading a take is not committing a version.** Anyone with project access
can hand one in and nothing audible changes; only a band leader moves main.
That is the same split `song_audio_versions` was built on, and the reason a
guest musician can contribute without overruling the band.

`songs.audio_url` survives as a *cache* of the mix slot's take in the current
version — nullable, written only by `commitVersion()`. A song built from stems
with no "Full mix" slot has none, and the dashboard player falls back to
playing the stems.

`song_audio_versions` is still in the database and read by nothing.
`scripts/add-song-stems.ts` carried every row of it into that song's "Full mix"
stem as a take. It stays as the ground truth behind that backfill until the new
tables have carried real use; dropping it is its own script.

The full reasoning, including the places where building it changed the plan, is
in `docs/decisions/stems-and-versioning.md`.

### Playback

One `AudioContext`, every stem decoded up front, all sources started against
the same clock. Several `<audio>` elements would each keep their own clock and
drift audibly apart within a chorus. Consequences worth knowing before touching
`useStemPlayer.ts`:

- **Seeking stops and restarts every source.** A buffer source cannot be sought
  and cannot be restarted once stopped.
- **Memory is the limit, not storage.** Decoded PCM is duration x sample rate x
  channels x 4 bytes, so a four-minute stereo stem is about 40MB whatever the
  mp3 weighed. `MAX_STEMS_PER_VERSION` exists for that reason and is not to be
  raised because the files turned out small.
- Mute and solo are one gain node per lane, which is why they were nearly free.

The studio decodes on arrival; the dashboard decodes only when play is pressed,
because it is the page you land on.

## Comments

`song_comments` carries two nullable, independent columns:
`timestamp_seconds` and `song_version_id`. That gives four shapes and all four
are used — a note about the song, a moment in the song whatever the version, a
moment in one version, and one version as a whole.

Waveform markers are the ones written about the version being played plus the
version-less ones, since those are true whatever is playing.

A version carrying comments cannot be deleted, the same shape as the rule for
takes. See `docs/decisions/comments-on-versions.md`.

## Admin

Exactly one account on the platform can read the tester feedback inbox, and
Postgres enforces it with a partial unique index over `users.is_admin`. A
second row trying to be true is rejected.

- No route writes the column and no schema accepts it. `scripts/grant-admin.ts`
  is the only path in.
- **The flag is not in the JWT.** A seven-day token would outlive its own
  revocation, so `requireAdmin` re-reads the column per request.
- The guard answers **404, not 403** — a signed-in stranger should find nothing
  there, not confirmation that an inbox exists.
- Admin means reading feedback and answering it. Nothing over anyone's bands,
  projects or files.

## Schema changes

**Do not run `drizzle-kit generate` or `drizzle-kit push`.** The snapshot in
`drizzle/` is still the initial migration while the schema has drifted well past
it, so both want to reconcile that entire drift against a database holding real
data.

Apply changes by hand in a `scripts/*.ts` one-off: `db.execute(sql\`…\`)` with
`CREATE TABLE IF NOT EXISTS` and inline foreign keys so it is idempotent, plus a
`--dry` flag. `scripts/add-song-stems.ts` is the fullest worked example, with
`add-comment-versions.ts` and `add-feedback.ts` beside it.

**There are no interactive transactions.** `db.transaction()` throws on the
neon-http driver. `db.batch()` is the way through — Neon runs a batch as one
transaction, verified in `scripts/probe-batch.ts` including that a failure
partway rolls the whole thing back. A batch has to know every statement up
front, which is why `commitVersion()` generates its version id in code rather
than letting the database do it.

**`NO ACTION`, not `RESTRICT`, for a reference inside a cascade tree.** Both
refuse a delete; `RESTRICT` checks immediately and `NO ACTION` at the end of
the statement. Deleting a song cascades into several stem tables at once, so
under `RESTRICT` the check fires against rows the same statement is about to
remove — and whether deleting a song, project or band works at all comes down
to the order Postgres happens to fire the constraints in.

Regenerating the snapshot properly is unfinished business, and worth doing
before the schema grows much further.

## The API route file

`app/api/[[...route]]/route.ts` mounts the Hono app **and must re-export every
HTTP method the app answers.** Next.js replies 405 before Hono sees the request
otherwise. PATCH was missing for a while and the routes behind it looked
correct, were mounted correctly, and were simply unreachable.

Two routers share the `/songs` base path — `songs.routes.ts` and
`stems.routes.ts`. Hono matches in registration order, so **they must never
define the same route**; the first one registered wins silently.

## Conventions that are load-bearing

- Nullable `*_by` columns with `onDelete: "set null"`, so history survives an
  account being deleted.
- A declined invitation is kept rather than deleted, so the answer stays visible
  and re-inviting flips the row back.
- Retired band slugs are kept unique in `band_slug_history`, so an old link can
  never quietly start resolving to a different band.
- Validation is hand-rolled in most routes and Zod only in auth and parts of
  users. Moving the rest to Zod is a worthwhile tidy that has not happened.

## Local development

`npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`.

**Do not run a build while the dev server is up.** They share `.next`, and the
running server ends up throwing errors that look like code problems. Use
`typecheck` and `lint` when only correctness needs checking.
