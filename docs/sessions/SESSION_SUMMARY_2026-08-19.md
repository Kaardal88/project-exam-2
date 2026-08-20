# Session Summary

Three features across two PRs: role management and band deletion (#23),
invitations you can decline (#23), and project-scoped guest collaborators
(#24). All merged to `main`.

The order was not arbitrary. Each step made the next one safe, and the first
one shipped no behaviour at all.

## 1. One membership resolver (`5f433be`)

The same `band_members` lookup was written out inline **ten times** in
`bands.routes.ts`, with a local copy in `projects.routes.ts` and another in
`songs.routes.ts`. Twelve copies of one question.

Consolidating it into `server/bands/membership.ts` was the precondition for
invitations, not tidying. Invitations need a pending/accepted distinction,
which means every membership lookup has to start filtering on status. With
twelve copies, missing one would have given a pending invitee full access to
the band before they ever accepted.

No behaviour change: 31 call sites, one query. The role checks stayed in the
routes because their error messages differ per endpoint.

**If you add a new access rule, add it in `membership.ts`, not in a route.**

## 2. Roles and band deletion (`e75f4b1`)

There was no endpoint to change a member's role **at all**. Leadership could
not be handed over, which is why account deletion auto-promotes the
longest-serving member instead of asking. And there was no `DELETE /bands/:id`
despite the cascade chain having been laid for it in the August 13 session.

- `PUT /bands/:id/members/:userId/role`, leader only, validated against
  `lib/bandRoles.ts`.
- `DELETE /bands/:id`, leader only, confirmed with the band name **and** the
  password — matching account deletion, because the JWT sits in localStorage
  and UI friction alone protects nothing on an unlocked laptop.

**`isLastLeader()` is the guard worth knowing about.** A band whose only leader
is demoted or removed is unrecoverable through the UI: every management route
is gated on `band_leader`, so nobody would be left who could appoint one. Both
paths refuse with a 409.

Also fixed a real bug in `DELETE /:id/members/:userId`: the "band leaders
cannot remove themselves" check ran **after** the delete, so a leader who tried
got a 400 back and lost their membership anyway.

## 3. Invitations (`ffe36f5`)

`POST /bands/:id/members` added you to a band outright. You were a member
whether you wanted to be or not, with no say and no notice.

`band_members.status` (`lib/inviteStatus.ts`) now holds
`pending | accepted | declined`. The invite route creates a pending row and
fills in `invited_by` and `invited_at` — two columns that had sat unused in the
schema since the table was written. `joined_at` is set on **acceptance**, not
invitation, because it is what "longest-serving member" sorts on when
leadership is handed over.

`getMembership()` filters on accepted. That one line is what step 1 existed
for. **The rest of the risk was in the queries that do not go through it**, so
all seven were audited and five needed the filter:

- your bands in `/auth/me`, and another user's bands
- the member list shown to guests — they see the line-up, not who has been asked
- the band calendar
- **the account-deletion plan** — the nastiest. Without the filter a pending
  invitation counts as membership, so a band whose only *accepted* member
  deleted their account would have been spared deletion by someone who never
  joined.

The member list shown to the band itself deliberately **keeps** pending rows so
a leader can see who has been asked, marked Invited/Declined. The avatar strip
filters them out, since that is the line-up.

A declined row is kept rather than deleted so the leader can see the answer;
re-inviting flips it back to pending rather than inserting a second row.

`status` defaults to `"accepted"`, so adding the column left all 37 existing
memberships working with **no backfill**. Both insert sites set it explicitly,
so nothing depends on that default being semantically right.

New `/invitations` page, reachable from the account menu — which is shared
between desktop and mobile, so one entry served both — with the count on the
avatar itself, since a closed menu would hide it.

## 4. Project-scoped guests (#24)

A collaborator — session musician, engineer, manager — can now be invited to
one album or single and reach that alone.

`project_collaborators` is **a separate table**, not a nullable project column
on `band_members`. A guest belongs to a project, not the band, so they must not
appear in the line-up — and keeping them out of `band_members` means that takes
no filtering at all. It also keeps `(band_id, user_id)` unique on
`band_members` meaningful, which a guest working on two projects for the same
band would otherwise break.

`server/projects/access.ts` is the resolver for anything under a project.
Projects and songs used to ask `getMembership(project.band_id, userId)` —
whether the user was in the **band**, which is the wrong question once a guest
can hold access to one project without belonging to it. 21 call sites now ask
`getProjectAccess()`, which answers with a source (`band` / `collaborator`), a
role, and `isLeader`.

**A guest resolves to the same rights a member has, on purpose.** Every check
in the codebase is `band_leader` vs everyone else, so a collaborator lands in
the same bucket as a member. That was the agreed starting point: a session
musician who cannot upload their take is useless, and it is easier to narrow
rights once real guests have used it than to guess now. `isLeader` is always
false for a guest, so every management route stays shut.

**Narrowing guest rights later means editing `access.ts`, not 21 routes.** No
capability map exists and none is needed yet — one was proposed and explicitly
deferred.

### Roles are labels, not permissions

`lib/collaboratorRoles.ts` holds guest musician / producer / engineer /
manager. They drive display and grouping, so when a restriction is wanted — a
guest not replacing the main audio file, say — it hangs off this value in one
place.

Kept **separate from `lib/userTags.ts`** deliberately. A tag is self-declared
global identity ("I am a drummer"); this is the capacity someone serves in on
one specific project. The same person can be a session musician on one and a
manager on another, and editing your own profile must never change your role on
someone else's project. `suggestedRoleForTags()` uses tags only to pre-select a
default in the invite form.

### One inbox

`GET /users/me/invitations` merges band and project invitations into a single
array with a `kind` field rather than giving the reader two lists. `respond`
takes the kind so it knows which table to write.

## 5. The recurring bug class

Three separate defects, all found by actually using the feature, all from the
same assumption: **that anyone looking at a project is a band member.**

1. **Back went to the band.** The project page's Back link always pointed at
   the band profile. A guest following it got a guest card at best, a 404 if
   the band is private. The payload now carries `access_source`.
2. **The song dashboard was broken for guests.** It read its band, role and
   member list from `/api/bands/:id`, which a collaborator cannot reach. A
   guest opening the song they were invited to work on got no sidebar and no
   role — the whole point of the feature failing quietly. It now takes context
   from `/api/projects/:id`.
3. **The sidebar offered "Band profile"** to everyone. Hidden for
   collaborators; the band name at the top stays but stops being a link.

**If something breaks for a guest, look for that assumption first.**

Guests were also invisible everywhere — kept out of `band_members` by design,
nothing named them, so you only learned a guest existed if they left a comment.
A shared `CollaboratorList` now shows them in the band's member modal (across
every project), on the project page (with Remove for leaders), and in the song
dashboard's metadata next to Contributors.

## Gotchas worth remembering

**`drizzle-kit push` exits 0 even when it aborts.** Adding the `handle` unique
constraint in the previous session made it prompt *"Do you want to truncate
users table?"*, and it returned exit code 0 after failing on the missing TTY.
**Read its output, do not trust its exit code.** That column and constraint
were added with explicit SQL instead.

**`react-hooks/set-state-in-effect`** fires if an effect calls a `useCallback`
that sets state. The rest of the codebase declares the async function inside
the effect; follow that pattern.

## Not done / explicitly out of scope

- **Following users.** The remaining piece of the collaboration work. A plain
  social follow, independent of any band. `project.md` lists it alongside
  Notifications, Activity feed and Discovery. **Deliberately undesigned** — the
  UI shape is an open question (new page, or a "people you connect with"
  section?) and the user wants to think about it first. `/users` (labelled
  Connect) is a flat directory with no relationship concept today.
- **A guest's own section in songDashboard** — their own audio contribution
  that does not replace the main track, their own notes, their own comments
  rendered alongside the rest. Deferred until a real guest has used what exists.
- **Public guest view of a user profile.** `GET /api/users/:id` requires auth,
  so even a canonical `/user/[handle]` link only works for signed-in
  recipients. Bands have a guest card; users do not.
- **`generateMetadata`/SEO.** Every page is still `"use client"`. This should
  wait for the planned localStorage→cookies move: a server component cannot
  read a JWT out of localStorage, so doing SEO first means doing it twice.
- **No general notification system.** The invitations inbox is deliberately
  narrow. A system with types, read/unread and an activity feed is a superset
  to grow into once invitations have been used.
