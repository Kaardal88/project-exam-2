# Artists: the same directory, pointed at bands

**Decided and built 2026-08-31**, the day after Connect. Kept in step with the
code.

The Artists page fetched every public band and rendered all of them in one
grid. No search, no filters, no sort. It is the sibling of the problem
`docs/decisions/connect-directory.md` describes, so it got the same treatment —
`server/bands/bands.directory.ts` next to `server/users/users.directory.ts`,
`lib/bandFilters.ts` next to `lib/connectFilters.ts`, built alike on purpose so
neither has to be re-read to work on the other.

What follows is only the places the two differ.

---

## 1. It is unauthenticated, and that is a rule in the query

`GET /bands/public` takes no session. A signed-out visitor browses the same
directory a member does — that is the point of an artist page.

So the visibility filter is not one of the conditions a caller assembles. It is
prepended to every query in `buildWhere()` before anything else is considered,
and no parameter can turn it off. Unlisted and private bands are reachable by
link or by membership and must never appear in a listing; putting that in the
route instead would mean a second caller could forget it.

`scripts/probe-band-directory.ts` asserts it against the real table rather than
trusting the reading: there is one private band in the database, and the
directory reports 31 of 32.

## 2. No landing gate

Connect shows an explainer and five profiles until you ask it something.
Artists shows the grid immediately.

They look inconsistent and are not. Listing every *person* by default is both a
wall and a privacy question. Listing every public band is the entire reason the
page exists — a band profile is published in order to be found, and a visitor
arriving at "Artists" has already said what they want.

## 3. Search is band name only

Asked for, and right. Bios are long and full of incidental words: searching
them makes "folk" match a band that once wrote *"for the folk at the back"*. A
search that quietly returns more than it should is harder to trust than one
that returns less, and the reader has no way to tell which kind they are
holding.

## 4. Random is a real sort and never a grid sort

"Show me something new" is `ORDER BY random() LIMIT 1` on the server, drawing
from **whatever the filters currently describe** — so it reads as "surprise me
with one of these" rather than ignoring the narrowing the reader just did.
Drawing from the loaded page would only ever surprise you with one of the
twelve already on screen.

`random` lives in `bandSorts` so that validation stays in one place, marked
`hidden` so it never reaches the sort menu. The reason it cannot be a grid sort
is paging: `ORDER BY random()` is re-rolled per query, so page two of a
randomly ordered list is not the continuation of page one but a fresh shuffle.
The reader would see the same band twice and never see others at all.
`getPublicBands()` reports `hasMore: false` for a random draw for the same
reason — a sample is not a page.

The result is **shown on the page** rather than navigated to, so pressing it
again is one click and the list underneath is still where you left it.

## 5. The landing page got faster by accident

`app/page.tsx` used to fetch every public band in order to shuffle four of them
and count the rest. It now asks `?sort=random&limit=4` and reads `total` off
the same response — four bands and the size of the catalogue in one request
that returns four rows.

## 6. Genre and country had to become editable first

The filters were the easy half. The database said: **26 of 32 bands had no
genre and 17 had no country.**

Both fields are `required` on `/bands/new` — and appeared nowhere afterwards.
The band edit modal never had them, and `PUT /bands/:id` accepted `country` but
silently dropped `genre`. So every band created before those fields existed,
and every leader who picked wrong, was stuck: filterable by nothing, for ever.

That is the same shape as the gap found in user registration the day before,
pointed the other way — there the field could not be set at signup, here it
could not be changed after. A filter nobody can fill in is not a feature, so
both fields are now on the band edit form, blank allowed. A band that does not
think of itself as one genre should not have to pick one.

Two smaller things came with it:

- `PUT /bands/:id` rejects a genre outside `lib/genres.ts` rather than storing
  it, since a band in a value no chip can select for is invisible to the
  filter.
- `""` normalises to `null` in `updateBand()` and in `POST /bands`, the same
  way `updateUser()` does it. An empty string in `country` would be a code the
  filter can never match and the card can never render a flag for.

## Not in

- **Sorting by size** — most members, most songs, most releases. Each is a
  join, and none of them is obviously the thing a visitor wants; "newest" and
  "A–Z" are.
- **Genre as a set.** `bands.genre` holds one value, so several chips mean
  "any of these" rather than "all of these". Bands that are two things at once
  will want the array eventually; that is a schema change and its own decision.
- **Filtering by what a band has released.** Needs the projects table in the
  query and a view of what "released" means, which the app does not have yet.
