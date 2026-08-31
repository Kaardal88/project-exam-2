# Connect: one directory, and every invitation starts there

**Decided and built 2026-08-31.** Kept in step with the code. The four things
left out are listed at the bottom and are left out on purpose.

Inviting someone to a band used to be a modal on the band profile that listed
**every account on the platform**, filtered in the browser by a search box.
Two problems, and only one of them is size.

The size problem is obvious: thirty-one testers fit on a screen, three thousand
people do not, and the fix is a query rather than a longer list.

The second is the interesting one. That modal could only ever invite **band
members**, because a modal floating over a band page has nowhere to ask the
question a guest invitation depends on: *onto which project*. So the app had a
guest model — managers, producers, engineers, session musicians — reachable
only from inside a project, and a "invite people" button that could not reach
it.

Connect already had search and a card per person. Everything moved there.

---

## 1. Band context lives in the URL

`/users?inviteFor=<bandId>`. Without it, Connect is browsing and no card offers
anything. With it, a banner says which band you are inviting to, every card
grows an Invite button, and the directory query returns each person's standing
with that band alongside them.

A URL rather than page state because the entry point is a link on the band
profile, and because "I was inviting to Nordlys and then I searched for a
drummer" has to survive a reload.

Two guards, and they are different guards:

- **The page** hides the buttons unless `/api/bands/:id` comes back with
  `role === "band_leader"`. That is display: a page that offers a button it
  already knows will 403 is a page lying to its reader.
- **The routes** refuse anyone else. `POST /bands/:id/members` and
  `POST /projects/:id/collaborators` each check leadership themselves and
  always did. Nothing about this change moved a permission out of the server.

A leader of several bands gets a picker on Connect rather than a guess. A
leader of one still has to choose it — an invitation to the wrong band is not
worth saving a click over.

## 2. A guest is not a fourth kind of band member

The plan asked for one role field with four values: band member, guest manager,
guest producer, guest musician. That is the right *user-facing* shape and the
wrong *data* shape, and the modal now says so out loud.

A band member is a row in `band_members` and belongs to the whole band. A guest
is a row in `project_collaborators` and belongs to **one album or single**,
deliberately — `docs/architecture.md` and the schema comment both say why: a
session drummer hired for one single must not appear in the band's line-up or
reach the rest of its work, and keeping guests out of `band_members` means that
takes no filtering at all.

So the role step offers all five options, and choosing a guest role reveals a
project picker instead of sending anything. There is no such thing as a guest
of a band. Offering one would have meant either inventing a second kind of
guest row or quietly picking a project on the inviter's behalf, and the second
is worse than the extra select.

Projects the person is already on are disabled in that picker with the reason
shown, so the answer arrives before the choice rather than as a 409 after it.

## 3. Tags stayed an array. No join table.

The plan said: if the user profile has no instrument/skill field, build a
`tags` table plus a join table, so that admin management and autocomplete
become possible without a migration later.

It already has one. `users.tags` is a `text[]` validated against
`lib/userTags.ts` — a closed vocabulary of seven values, checked by Zod on the
server and rendered as chips on the client, following the `lib/bandRoles.ts`
pattern that keeps every shared vocabulary in one file so the two sides cannot
drift.

A join table would buy the ability to add a tag without a deploy. It would cost
a migration, two tables, a second query on every directory page, and the loss
of the one property that makes the filter cheap: `tags && ARRAY[...]` against a
GIN index is a single index scan, and `scripts/add-user-connect-fields.ts`
creates that index. Nothing in the plan needs a tag the codebase does not know
about — the chips render *from* `userTags`, so a tag the file has never heard
of would be unfilterable anyway.

When tags become something bands invent for themselves, that is the migration
to write. Today it would be a join table serving seven constants.

## 4. Roles are derived, not stored

"Band leader", "Member", "Guest · Producer" are not columns on a user. They are
facts about rows in `band_members` and `project_collaborators`, and they are
true of a person only because some band made them true.

So `lib/connectFilters.ts` is the union of `bandRoles` and `collaboratorRoles`,
each tagged with which table it lives in, and the filter resolves to an EXISTS
over that table. A subquery per table rather than a join, so someone holding
the same role in three bands is one row in the result rather than three.

An unrecognised role value matches **nothing** rather than being ignored. A
chip the reader believes is narrowing the list must never quietly do nothing.

## 5. Two columns the plan assumed existed

`users` had neither.

- **`country`** is on `bands`, not on `users`. Added as nullable cca2 — the
  same two-letter code, so one `world-countries` list renders both — and asked
  for **at registration and on the profile**, in both cases with a blank option
  reading "Rather not say". A directory filterable by instrument *and* location
  is a sharper instrument than a list of names, and that cuts both ways: where
  someone lives stays something they publish rather than something the schema
  demands.

  Optional, unlike the country on a band, which `/bands/new` marks `required`.
  A band is a public act with a home scene; a person is a person, and this
  field feeds a filter other people search on. Asking at signup is worth it
  because a field nobody is prompted for stays empty and the filter finds
  nobody — but asking is not the same as insisting.
- **`created_at`** did not exist at all, which is what "Newest first" sorts on.
  Postgres fills existing rows with the DEFAULT at the moment of the ALTER, so
  all thirty-one accounts share one timestamp and cannot be ordered among
  themselves. The query therefore sorts `created_at DESC, username ASC` — the
  tiebreaker is not tidiness, it is what stops those rows shuffling between
  pages of one offset-paged result and the grid showing the same person twice.

## 6. The landing view shows five people, not everyone

Before any search or filter, Connect explains what it is and shows five
recently-joined profiles. Rendering the whole user base was the old behaviour,
and it is the one view where the reader has told you nothing about who they are
looking for — so showing them everyone is the least useful answer available.

After a search or filter: twelve per page, one column on mobile to four on
desktop, and a "Load more" button over offset paging rather than numbered
pages. Nobody reading a directory wants page 4; they want more.

An empty result names what was asked for — *No matches for "Drummer · Band
leader" in Norway* — because "no results" tells the reader nothing about which
of their four filters to loosen.

## 7. "Most relevant" is only offered once something is being matched

Sorting an unfiltered directory by relevance is sorting by zero, so the option
is disabled until a filter is active, and selecting it and then clearing the
filters falls back to newest rather than leaving the list in an order nothing
explains.

Relevance is the count of matching tags, computed in SQL:

```sql
(SELECT count(*) FROM unnest(users.tags) AS tag WHERE tag = ANY(ARRAY[...]))
```

In SQL rather than JavaScript because ranking in the browser would only
reorder the twelve rows already on screen, which is not a sort — it is a
shuffle of an arbitrary page.

---

## Not in

- **Rate limiting on invitations.** Real spam protection needs somewhere to
  count from, and there is no store for it. Worth doing before the app is
  public; not worth a half-measure now.
- **A "visible on Connect" switch.** The directory got sharper today, which is
  exactly the argument for one — but it is a column, a settings control and a
  filter on every directory query, and it deserves its own decision rather than
  a line at the end of this one. `country` being opt-in is the part of it that
  could not wait.
- **Saving or bookmarking a profile, and report/block.** Both are their own
  feature with their own storage.
- **"Recently active" sorting.** Nothing tracks `last_active`. It needs a write
  on every authenticated request, which is a round trip per call on a
  serverless database — the same objection that keeps the JWT stateless. Noted
  as a TODO in `lib/connectFilters.ts`.

Following, activity feeds and posts ("band looking for a manager in Stavanger")
stay out entirely. Nothing added here touches them: no `connections` table was
created, and invitations still live in `band_members` and
`project_collaborators` exactly as they did, so a feed can be built later
without unpicking any of this.
