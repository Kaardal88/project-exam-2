# Session Summary

Everything needed before five outside testers get logins, across three PRs:
pre-test hardening (#25), audio version history (#26), and tester feedback
(#27). #25 and #26 are merged; #27 is open.

The organising question was not "what is left to build" but "what changes
meaning the moment someone who is not me has an account". Polish — landing
page, calendar, member cards, sorting on Connect — was deliberately left for
after the first round of feedback.

## 1. Security audit (`15f82ce`, in #25)

Read the whole API surface. The role model held up: every mutating route
resolves membership from the database before acting, and none is protected by
conditional rendering alone. Passwords are bcrypt at 10 rounds, and login
already defends against timing-based account enumeration.

Three things did not hold up.

**An R2 key reached `getDownloadUrl` and `deleteObject` straight from a
request body**, and neither asks who owns the object it is handed. Every
presigned URL contains the key it signs, so anyone who ever had legitimate
access to a song kept that key forever: pointing their own song at it and
asking for a download URL read the file back *after* their access was revoked,
and replacing the audio afterwards deleted the other band's object while the
database went on pointing at it. Keys are now checked against the
`songs/<songId>/` prefix the presign route issues, on all three paths that
accept one — see `isKeyForSong()` in `server/r2.ts`.

**`GET /auth/users/:userId` served any user's email with no authentication.**
Nothing called it. Deleted rather than gated.

**`GET /users` and `GET /users/:id` listed email** alongside public profile
fields, so one test account was enough to harvest every address. The database
already held six or seven real addresses belonging to real people, so this was
protecting something, not a hypothetical.

## 2. Session moved to an httpOnly cookie (`6e8d853`, in #25)

localStorage is readable by any script on the page. Acceptable while the only
account was mine; not acceptable the week strangers get logins.

**The Authorization headers were the easy half.** The real work was that the
client used "is there a token in localStorage" as its own answer to "am I
signed in", in twenty-eight places. It cannot see the cookie, so a 401 is that
answer now, and the gates that redirected to `/login` redirect on the response
instead.

Two places genuinely need to know before any request returns — the nav bar and
the back button. They read `bs_signed_in`, a second cookie carrying `1` and no
secret. **It is a rendering hint and grants nothing**; forging it gets you a
different-looking back link.

`SameSite=Lax` stands in for CSRF protection, which is why logout became a POST
rather than a GET a prefetch could fire. `Secure` is bound to `NODE_ENV`.

**Never add an `Authorization` header to this codebase again.** `CLAUDE.md` was
updated in the same PR, because it still said the opposite and would have been
read as a standing instruction.

## 3. The media player was partly scenery (`e76ddb5`, in #25)

Volume was a static icon with nothing behind it; "Expand player" was a disabled
button reading "Coming soon". Both work now, and expanding opens over the
dashboard column rather than the viewport, so the sidebar stays readable beside
the blur.

Two fixes fell out that were not visible from the outside:

- **The `<audio>` element had to be hoisted** out of the collapsed/expanded
  branch. React reconciles by position, so letting it move would unmount and
  remount it — playback stops, playhead resets.
- **The `ResizeObserver` was bound once with an empty dependency list**, so
  after expanding it was still watching a discarded node. The expanded player
  would have drawn a full-width waveform at mobile resolution.

## 4. Audio version history (#26, merged)

A guest musician has to be able to hand in what they played. A guest musician
must not be able to decide what the song is. **Before this those were the same
act** — "replace the audio" overwrote the pointer and deleted the old object,
so anyone who could upload could also overrule the band and destroy the take
they overruled.

`song_audio_versions` splits them. Uploading adds a row and changes nothing
audible; promoting one is a band leader's call and moves a pointer.
`songs.audio_url` stays as that pointer, so playback and the key validation
carry on untouched, and **which row is current is derived** from `r2_key ===
audio_url` rather than stored, so the two cannot disagree.

`PUT /songs/:id` no longer accepts `audio_url` at all — 400 with the name of
the route that does, rather than ignoring the field and letting an old client
believe it worked. Deleting the current version is refused; promote another
first, the same shape as the guard against a band losing its last leader.

**The destructive path is gone rather than guarded.** Nothing is deleted on
promote, which was the last remnant of the R2 hole above.

In the player, previewing swaps only what the player points at. Comment markers
hide while previewing, because they are timestamped against the song and would
land on the wrong moments in a take of a different length.

## 5. Password change and recovery (`d4849ea`, in #27)

Testers were about to get accounts with no way to change a password and no way
to recover one.

`PUT /users/me/password` requires the current password — without that check,
anyone holding a live session could lock the owner out, which is the attack a
password change defends against rather than enables.

**It does not end sessions on other devices, and the code says so.** A
stateless JWT can only be invalidated by keeping a token version in the
database and reading it on every authenticated request; that is a round trip
per call on a serverless database, on pages already making six in parallel.
The success message tells the user rather than implying otherwise.

`scripts/reset-password.ts` generates the password rather than taking it as an
argument, so it never lands in shell history. **There is still no
change-password route for someone who receives one that way** — worth fixing
before anyone outside a closed round signs up.

A real "forgot password" needs an email provider, a verified sending domain and
a token table. That is the same job as email verification, so it is one piece
of work, not two, and it is not started.

## 6. Tester feedback (`7efce49`, in #27)

**Only one person can ever read the inbox, and Postgres enforces it.** A
partial unique index over `is_admin` means the second row trying to be true is
rejected outright:

```sql
CREATE UNIQUE INDEX users_single_admin_idx ON users (is_admin) WHERE is_admin = true
```

No route writes the column and no schema accepts it. `scripts/grant-admin.ts`,
run by hand, is the only path in. **The flag is deliberately not in the JWT** —
a seven-day token would outlive its own revocation — so `requireAdmin` re-reads
it per request, paid only on feedback routes.

`requireAdmin` answers **404, not 403**. A tester poking at `/api/feedback`
finds nothing there rather than confirmation that an inbox exists.

Admin means reading feedback and answering it. Nothing over anyone's bands,
projects or files.

`reply_seen_at` exists because "new" needed to mean something: a badge counting
every answer would never clear, and one that never clears stops being read.
Editing a reply clears it again. Marking as seen is its own call, not a side
effect of the GET — a GET that quietly changes state is what a prefetch fires
by accident.

## Things worth knowing next time

**`drizzle-kit generate` and `push` are both unsafe here.** The snapshot in
`drizzle/` is still the initial migration while the schema has drifted far past
it, so both want to reconcile that whole drift against a database with real
data. Schema changes are applied by hand in `scripts/*.ts` one-offs, idempotent,
with a `--dry` flag. See `add-song-audio-versions.ts` and `add-feedback.ts`.
**Regenerating the snapshot properly is unfinished business.**

**Do not run `npm run build` while the dev server is up.** It shares `.next`
and corrupts the running server's state. This was done twice this session and
cost debugging time both times.

**The working account moved from `kim_andre@example.com` to
`kaardal88@gmail.com`.** `@example.com` is reserved (RFC 2606) and can never
receive mail, which makes it the right choice for throwaway accounts and the
wrong one for the account that has to persist.

## Left for after the test round

Deliberately not built, and not bugs: avatar and header upload with a new
Cloudflare bucket; the invite flow moving from a modal to the Connect page;
tablature sheets in the song dashboard; sorting and filtering on Connect and
Artists; and the polish list generally.

**Also outstanding:** nothing distinguishes "this song has its own artwork"
from "this song is showing the album cover" — the fallback is silent, and it
confused the person who built it. Worth watching for in tester reports.
