# Comments: about the song, and about a version

**Decided 2026-08-26, built 2026-08-27.** Kept in step with the code; the two
things marked as still open at the bottom are the only parts not in.

Comments are timestamped against the song. Once a song is a stack of versions
that can differ in length and content, "the vocal is flat at 1:23" stops being
a fact about the song and becomes a fact about one arrangement. The player
already works around this by hiding every marker the moment you listen to
anything but the current audio, which is a way of admitting the problem rather
than solving it.

The ask is a combination: general comments about the song, and comments about a
particular version. That falls out cleanly if we stop treating it as a choice.

---

## 1. Two fields, independent

`song_comments` gains `song_version_id` (nullable), and `timestamp_seconds`
becomes nullable. Neither implies the other, which gives four shapes — all of
them things bands actually say:

| Version | Timestamp | What it is | Example |
| --- | --- | --- | --- |
| — | — | A note about the song | "We need a bridge" |
| — | `1:23` | A moment in the song, whatever version | "The chorus always drags here" |
| `v7` | `1:23` | A moment in one version | "Vocal is flat here" |
| `v7` | — | One version as a whole | "This mix is too bright" |

The fourth is easy to overlook and is the one a mix engineer will use most.

**The backfill needs no guessing.** Every existing comment becomes
`song_version_id = null` with its timestamp intact — row two, "a moment in the
song, whatever version". That is exactly what they were: they were written
before versions existed, so they were never about one.

`timestamp_seconds` going nullable is the part that touches existing code —
the player markers, `CommentsTab` and `CommentsPreview` all assume a number
today.

---

## 2. Deleting

A version carrying comments cannot be deleted. Same shape as the rule for
takes: something people have reacted to should not vanish because somebody
tidied up. The route answers 409 with the count; the foreign key is
`no action` behind it, for the same statement-ordering reason as
`song_version_stems` (see `stems-and-versioning.md` §4.5).

`on delete cascade` was the obvious alternative and is wrong: an open ticket
assigned to somebody would disappear silently. `set null` is worse — the
comment would survive stripped of the context that made it make sense, and
reappear in the song-wide list as a mystery.

---

## 3. The UI, which is the actually uncertain part

**The model is GitHub's: comments on an outdated version are not deleted, they
are collapsed.**

```
┌─ Comments ──────────────────────────────────────────┐
│  About the song                        [ + Note ]   │
│  • We need a bridge              — Kim, open        │
│  • 1:47  Chorus always drags     — Adrian, open     │
│                                                     │
│  On v7 · current                                    │
│  • 1:23  Vocal is flat here      — Adrian, open     │
│  • 2:40  Snare too loud          — Kim, done        │
│                                                     │
│  ▸ 4 comments on earlier versions                   │
└─────────────────────────────────────────────────────┘
```

### Where each kind gets made

| Action | Produces |
| --- | --- |
| Click the waveform → "Comment?" | timestamp + **the version you are hearing** |
| "+ Note about the song" in the Comments tab | no timestamp, no version |
| "Comment on this version" in the version bar's ⋯ menu | version, no timestamp |

Built as sketched, with one change of address: the history row became the
version bar, so the third entry lives in its overflow menu. It is the one of
the three not gated on being a leader — anyone working on the project can say
what they think of a mix.

The modal states both facts in words before you write anything ("1:23 · v9 ·
Added Bass Ref", or "the song as a whole · whichever version is current"),
because a comment meant for the current mix that quietly lands on last week's
version is worse than no comment.

The waveform case is the one to get right: if you are previewing v5, the button
should say so, because a comment you meant for the current mix landing on an
old one is worse than no comment.

### Markers

Show the markers belonging to the version being heard, **plus** the
version-less timestamped ones — those are about the song, so they are always
true. This replaces the current blunt rule of hiding everything during a
preview, and it is a strictly better answer: today a preview hides feedback
that was perfectly valid.

### Carrying a comment forward

An open comment from v5 that still applies at v7 is the case that decides
whether this is pleasant or infuriating. Without an answer, every new version
buries the outstanding work.

The answer is one button on a collapsed comment: **"Still an issue → move to
v7"**, which re-pins it. Not automatic — a comment about a take that has since
been replaced usually *is* resolved, and silently dragging everything forward
would make the current version's list meaningless.

---

## 4. What this does not solve

**Comments are not attached to a stem.** In a studio with twelve lanes, "the
guitar is out of tune at 2:14" wants to point at the guitar lane, not at the
song. That is a third nullable column (`song_stem_id`) and a click target on
the lane rather than the master waveform.

It is probably more valuable than the version dimension for a band — but it is
a separate decision with its own UI, and bolting it on here would mean building
two uncertain things at once. Worth doing next, not now.

---

## 5. Rough size

- Schema: two nullable columns, one migration script, a backfill that is a
  no-op by design.
- Server: `song_comments` routes gain a version filter; version deletion gains
  a guard.
- Client: `CommentsTab` grows the three groups, `CommentsPreview` shows
  song-level plus current, `MediaPlayer` and `StudioTab` pass the version they
  are playing into the "Comment?" flow, and every place that assumes
  `timestamp_seconds` is a number learns that it might not be.

The client is the bulk of it, and the marker rule is the piece most likely to
be got subtly wrong.
