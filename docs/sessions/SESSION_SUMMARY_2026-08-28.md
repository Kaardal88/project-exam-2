# Session Summary

Four things, in three PRs: #33 (the double loader and the back button), #34
(the board), and the tasks branch that follows from it. Plus one bug that was
not in the code at all.

The thread running through the day: **a lot of state was being held in React
that the browser already had a place for.** Two separate complaints -- a loader
that ran twice, and a back button that threw you out of the song -- turned out
to be the same mistake made in opposite directions, and the board is what
happens when a *tab* stops being enough to hold a question.

## 1. Two bugs, one mechanism

**The profile loaded twice** because `/user` resolved the signed-in user, then
called `router.replace("/user/<handle>")` to park the address bar on a
shareable link. `/user` and `/user/[handle]` are two routes, so that was a
route change: the view unmounted and a second copy mounted at `loading = true`
and fetched everything again. The loader ran, stopped, and started over.

**The song dashboard's back button left the song entirely** because
`activeTab` was React state. The whole dashboard was one history entry, so
clicking through Studio, Comments and Files and pressing back landed on the
project -- and getting back to where you were meant opening the song from the
top again.

Both are `window.history`. Next syncs `pushState`/`replaceState` into the
router, so `usePathname` and `useSearchParams` re-render **without a route
change and without unmounting anything**
(`node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`,
"Native History API"). The profile now changes its address without remounting;
the tab lives in `?tab=` and each one is a history entry of its own.

Three details in the tab work that are the difference between it working and
looking broken:

- Dashboard is the default and **stays out of the URL**, so the address a song
  is normally shared under is unchanged.
- An unknown `?tab=` falls back to Dashboard rather than rendering nothing --
  `isSongTab` in `SongTabs.tsx` is the one place that decides.
- Asking for the tab already open pushes **no** entry. `requestSeekAndShow`
  sets Dashboard when a timestamp is clicked and is often already there; without
  the guard, back had to be pressed twice before anything moved.

## 2. The WIP tab could never have filled

`components/bandProfile/WIP.tsx` and `Finished.tsx` were nine-line
placeholders. They were not unfinished -- they were **unfillable**:
`songs.status` existed in the schema with a `wip` default, and nothing
anywhere in the app could set it. A tab whose content depends on a field no UI
writes stays empty forever.

They also asked the smaller question. "Which songs are not done" is a filter.
"Where has each song got to, and what is it waiting on" is the thing a band
actually opens an app to find out, and it needs columns.

So: `/band/[slug]/board`, its own route rather than a profile section. The
profile is the band's shop window and its sections are collapsible cards;
four columns do not fit inside one. It is also an address somebody wants to
send to the rest of the band, which a section held in React state cannot be --
the same argument as the tab above, one level up.

**Band-wide, across every album and single.** A band works on an album and two
singles at once, and "what are we working on" is one question. `GET
/api/bands/:id/songs` crosses projects so the reader does not have to open
three boards and hold the answer in their head.

## 3. Four stages, and not one row touched

`songs.status` is a plain `varchar(20)` with no enum and no check constraint,
so **`lib/songStatus.ts` -- not the database -- is what the stages are.**

Two of the four were already there. `wip` is the column default every existing
song was written with; `finished` is the word `app/projects/[id]/page.tsx` and
the song header have always shown. Only `backlog` and `mixing` are new, and
nothing had to be migrated. That is also why the fourth column is called
**Finished and not Done**: "Done" would have been a second word for a value
that already had one, plus a migration for nothing.

**Value and label are separate**, the same split `ticketStatus.ts` makes. The
heading is free to rename in one line; the stored value is not. This is the
answer to "am I sure about these words" -- only half the decision is expensive.

One thing recorded rather than resolved: comment tickets already use
`Open / WIP / Done`. Calling a board column "WIP" means the same word means two
things in the same app -- a song's stage, and one ticket's state. It was kept
because `wip` is the free value and the label can change later.

## 4. The card is a link; the handle is the drag

Dragging is on a grip handle, not the whole card. A surface that is both a link
and a drag target has to guess what a press meant, and gets it wrong often
enough to be annoying on a trackpad and unusable on a phone. The handle also
gives `@dnd-kit`'s keyboard sensor something to focus, so the board works
without a mouse -- tab, space, arrows, space.

`@dnd-kit/core` 6.3.1 only, no `sortable`: cards move *between* columns and are
not ordered *within* one, so half the library was not needed.

**Moves are optimistic and put the card back if the write fails.** A card left
sitting in a column the database disagrees with is history that quietly
changed -- the same failure the stems work spent a session designing against,
and it would only be discovered on the next reload.

Status is settable from the song header too. Somebody who has just finished a
mix is inside the song, and making them go and find a board to say so is how a
stage stops being kept up to date.

## 5. Tasks are flatter than tickets, because the table says so

`song_tasks` had a GET route and a comment promising POST "in Phase 2". The
board is what made it worth finishing: WIP covers writing through tracking,
which is right for how a band works but leaves the widest column saying only
"in progress". A card reading **2/7** puts the resolution back without
splitting the column in two.

The permission question answered itself. **`song_tasks` has no `created_by`
column** -- "re-amp the guitars" belongs to the song, not to whoever typed it
-- so there is nobody who would be the one allowed to tick it off. Anyone who
can open the song can add, tick and remove. A band of four does not need
permissions on a to-do list; it needs the list to be right.

Compare `song_comments`, which has an author, a status, a status *history* and
a rule about who may move it. The two look similar on screen and are not the
same shape at all.

**The due date came out again the same day it went in.** A deadline is an
agreement about *when*, which is a different conversation from what is left to
do -- and a date field asks for that agreement every time somebody types a
line. Rows show when the task was added instead, which suits a list ordered
newest-first and is the number that tells you something is going stale. The
column stays in the table and the routes still accept it: a change of mind, not
a demolition.

## 6. The bug that was not in the repo

Stems would not load on the Netlify deploy, with a generic "try refreshing"
that could never have helped. It was **Cloudflare R2's CORS
`AllowedOrigins`**, still naming the pre-rename origin after Vardo became
StemLock the day before.

The diagnostic worth keeping: stems are fetched with `fetch()` so
`decodeAudioData` gets the whole file, which needs CORS; plain `<audio src>`
playback does not. So a missing origin looks like "stems are broken" while
everything else works. **The test is whether a normal song's waveform draws** --
`MediaPlayer.tsx` fetches the same file the same way. Plays but no waveform
means CORS. Waveform fine but stems dead means look somewhere else.

## Things worth knowing next time

- **`window.history.pushState` is the tool for "state the browser should own".**
  It integrates with the App Router; `router.push` to the same page does not do
  the same thing, and across two routes it remounts.
- **A merged PR does not update your local `main`.** Working files looked
  pre-fix for a moment this session purely because `main` had not been pulled;
  `git fetch` showed the merge sitting on `origin/main` all along. Check
  `origin/main`, not the local ref.
- **`songs.status` has no constraint**, so adding a stage is a code change.
  That cuts both ways: nothing stops a bad value being written either, which is
  why the PUT validates against `SONG_STATUSES` and the board falls back with
  `toSongStatus` rather than dropping a song out of every column.
- `song_comments` does **not** validate `assignee_id` against the band, and the
  new task routes follow suit rather than inventing a rule in one place. The
  dropdown only offers members, so it is not reachable from the UI.
- Board counts (open comments, done/total tasks) are grouped server-side in
  `GET /api/bands/:id/songs`. Per-song fetches would open the board with a
  dozen requests in flight.

## Left for later

- **A project archive.** `projects` has no status column at all, so putting a
  finished album away needs a hand-written idempotent `scripts/` one-off --
  `add-song-stems.ts` is the worked example. This is the one piece of the board
  idea that costs a schema change.
- **The word "WIP"**, if it stops fitting after a few days of use. One line in
  `lib/songStatus.ts`, no data.
- **Assignee validation**, if it is ever worth doing, should be done for
  comments and tasks together.
- `app/band/[slug]/page.tsx` canonicalises the slug **twice**, around lines 221
  and 238, the second with odd indentation. Harmless, duplicated.
- Ordering tasks by hand, and ordering cards within a board column. Both would
  need `@dnd-kit/sortable` and a sort column; neither has been asked for.
