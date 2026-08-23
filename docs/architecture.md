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
- `bs_signed_in` is a second cookie carrying `1` and no secret. The nav bar and
  the back button read it to decide what to draw before any request returns.
  **It is a rendering hint with no authority** — forging it changes what a link
  looks like and nothing else.
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

## Files and R2

Uploads are presigned. The browser asks `POST /songs/:id/presign-upload`, gets
a URL, and PUTs the file to R2 directly.

**Keys are always scoped `songs/<songId>/…`, and that is checked on the way
back in.** `getDownloadUrl` signs whatever key it is handed and `deleteObject`
deletes whatever key it is handed — neither asks who owns the object. Since
every presigned URL contains the key it signs, an unvalidated key from a
request body is a request to read or destroy any object in the bucket. See
`isKeyForSong()` in `server/r2.ts`, and use it on **any** new path that accepts
a key.

## Audio versions

`song_audio_versions` holds every take a song has had. `songs.audio_url` stays
as the pointer to the current one, and **which row is current is derived** from
`r2_key === songs.audio_url` rather than stored, so the two cannot disagree.

Uploading a version changes nothing audible; promoting one is a band leader's
decision. This is what lets a guest musician contribute without overruling the
band. `PUT /songs/:id` rejects `audio_url` outright and names the route that
does the job.

Nothing is deleted on promote. The old take stays in the log.

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
`--dry` flag. `scripts/add-song-audio-versions.ts` and `scripts/add-feedback.ts`
are the worked examples.

Regenerating the snapshot properly is unfinished business, and worth doing
before the schema grows much further.

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
