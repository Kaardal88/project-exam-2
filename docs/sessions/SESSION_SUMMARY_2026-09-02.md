# Session Summary

Three days, 2026-08-31 to 09-02, with one thread running through all of it:
**pictures became something you upload rather than something you paste a URL
for.** Everything else grew out of that, plus a round of mobile testing at the
end.

Two PRs merged (#37 profile editing, #38 release artwork) and five commits
waiting on `feat/ui-polish`.

## The image fields were asking for something nobody has

Both edit-profile modals had two text inputs labelled "Image URL". That quietly
assumed the picture was already hosted somewhere public — true for the people
who built this and nobody else. A tester with a photo on their phone had no way
in at all.

### Two buckets, because public and private is a bucket-level setting

Stems and song audio live in a private R2 bucket, read through a signed URL
that expires in fifteen to thirty minutes. Right for a band's unreleased
material and wrong for a profile picture in every respect: `image_url` renders
as a bare `<img src>` in twenty-odd places, so a directory listing twelve bands
would sign twelve URLs before it could paint, and each would rot within the
hour.

R2 has no per-prefix public access. So there are two buckets now, sharing one
S3 client and one access key, with `getUploadUrl` and `deleteObject` taking the
bucket as an argument and defaulting to the private one.

**What gets stored is the finished URL, not a key.** That is the decision that
made the rest cheap: not one of the twenty-odd call sites changed, hand-pasted
URLs keep working beside uploaded ones, and there was no migration and no
schema change. The cost is that the column is not self-describing — you cannot
tell from the value whether the object is ours — which is why deletion had to
be written carefully and why the validation is what it is.

The browser downscales and re-encodes to WebP before uploading: 512px for an
avatar, 1600px for a header, 1000px square for a cover. A 9MB phone photo lands
at roughly 40KB. Without it, every visitor to Connect would download twelve
phone photos to render pictures 40px wide.

### The failure that cost an hour, and the script that exists because of it

Uploads failed with `No 'Access-Control-Allow-Origin' header` while the CORS
policy was already correct. The cause was the R2 API token being scoped to
`bandstructure-media` alone.

Signing a URL is pure cryptography and asks nobody's permission, so the server
happily signs a PUT for a bucket the key cannot write to, and R2 rejects it
only when the browser uses it — as a 403, which carries no CORS header, which
the browser then reports as a CORS failure. Every signal points at the thing
that is fine.

`scripts/probe-r2-buckets.ts` settles it in seconds by running server-side,
where CORS does not exist: a 403 there means token scope, and success there
means look at CORS or the bucket's public-access setting.

## Where a field lives now

> What is visible on the page is edited on the page. What identifies the
> account, or steers a directory, is edited in Settings.

| | edited where it is shown | edited in Settings |
|---|---|---|
| **User** | avatar, header | username, country, tags |
| **Band** | avatar, header, bio, social links | name, profile URL, visibility, country, genre, deletion |
| **Project** | cover art | — |

Bands got `/band/[slug]/settings`, leader-only, mirroring `/settings`. Both
modals are deleted.

This works because both update routes already ignored absent keys — drizzle's
`.set()` drops `undefined` — so each surface sends only the fields it owns and
saving the bio cannot disturb the visibility. Five small saves against one
route, not five routes.

The eight social links became `lib/socialPlatforms.ts` on the way: they were
eight near-identical display blocks plus eight form inputs, and adding inline
editing on top would have made sixteen places to keep in agreement.

Members moved out of the profile header and into a tab of its own. It had been
a card showing four avatars with a "See all" that opened a modal holding the
actual list — so the line-up was two clicks deep while occupying the header,
and the header carried four controls at three different sizes. A section rather
than a page, because it reuses the members, collaborators and role handlers the
band page has already loaded.

## Artwork belongs to the release, not the track

`projects.cover_image_url` already existed and was already rendered in five
places, and nothing in the app could set it. The create route accepted the
field; no caller ever sent it.

A leader sets it on the project page now. Not in the New project modal — a
project has no id until it exists, and the presign route authorises against
one — so the modal says where the cover goes instead.

**Songs no longer have artwork of their own.** The song page had its own
upload, into the *private* bucket, read back through an expiring signed URL,
falling back to the project cover when absent. That inverted the real
relationship: every track on an album shows the album's sleeve, and a single's
sleeve is the single's. `PUT /api/songs/:id` no longer accepts `artwork_url`,
because storing a value nothing displays is worse than refusing the write. The
column stays with its data; the change that stops reading a column is not the
change that should drop it.

Replaced pictures are deleted now, in `server/uploads/replacedImages.ts`. It
runs *after* the write so a failed save cannot take the old picture with it,
and it only deletes a URL that resolves into our own public bucket — a
hand-pasted one is left alone. Failure is logged and swallowed: an orphaned
object costs a fraction of a cent, and a 500 on a save that already succeeded
costs someone their work.

## The calendar bug that looked like a data leak and was not

Opening a stranger's profile drew a calendar under their name with events on
it. Reported as the most serious problem found, and it is worth being precise
that it was not a leak.

The endpoint is `/api/users/me/events` — `requireAuth`, scoped to
`c.get("userId")`, structurally incapable of returning anyone else's events
because it never learns whose profile is being viewed. What you saw on another
person's page was *your own* calendar. The giveaway was in the report itself:
the cards read "Unknown band", because the band name resolves against the
*viewed* profile's memberships and your own band is not among them.

One missing condition caused it. `fetchPrivateEvents` had always guarded on
`isOwnProfile`; `fetchUserEvents` did not — which is why private events never
appeared on a stranger's profile and band events always did, an asymmetry that
made a slip look targeted.

All nine event endpoints were audited while there. Every one requires auth,
every one scopes to the caller or checks `getMembership` first, and not one
takes a user id from a URL or a body.

## What mobile testing found

- **Rich text did nothing visible.** The notes and lyrics editor carried
  `prose prose-invert prose-sm`, and `@tailwindcss/typography` is not
  installed — three class names styling nothing. Tiptap emitted real `<h2>` and
  `<ul>` all along; Tailwind's preflight stripped them back to plain text. Bold
  and italic worked, which is the signature: those two have browser defaults
  preflight leaves alone. Styles written out as `.stemlock-richtext` rather
  than adding the plugin.
- **Hover is not a thing a phone has.** The camera overlay only appeared on
  hover, so touch had no indication a picture could be changed at all. Desktop
  keeps the overlay; below `md` there is a badge instead — bottom-centre on an
  avatar, because that container is a clipped circle and a corner badge is
  masked away.
- **The version number is the version.** The studio switcher had the label in
  bold yellow and `v09` in small grey, so "added bass" read as the thing being
  pointed at rather than the take it produced.
- **The country flag** is left-aligned on a user profile now. The band profile
  never centred it, which is why the two looked different.

Two defects surfaced underneath those. The shadcn `Button` sets no `type`, so
inside a `<form>` it is a submit button — and one was the role picker's trigger
inside the profile form, where opening it submitted the form. And the five
routes behind `zValidator` answer a validation failure with a ZodError
**object** in `error`, so `setError(data.error || ...)` stored an object, and
React throws when it renders one: a rejected save looked like a broken page
rather than a form saying no. The register page already guarded against this
inline, which suggests it had bitten before. That guard is now
`lib/errorMessage.ts`, used by all four consumers, and it logs status and body
on the way past.

Also from this stretch: the Board tab was yellow while every other tab was
white, and the cause was not the tab. `a { color: inherit }` sat unlayered in
`globals.css`, and Tailwind v4 puts its utilities in a layer — unlayered CSS
beats every layer, so that rule had been overriding `text-*` on every link in
the app. Board was simply the only `<Link>` in a row of `<button>`s. Moved into
`@layer base`.

## Two hours lost to not checking the branch

Worth writing down because the cost was real. A CSS rule appeared to have no
effect, and three wrong diagnoses followed: "not in the build" (`.next/static/css/`
was grepped, and does not exist in this Next version — compiled CSS is in
`.next/static/chunks/*.css`), then "stale dev server", which cost a VSCode
restart, then a full `.next` delete that changed nothing.

The working tree had been checked out to `main`, and the branch holding the
work was unmerged. The rule had never existed in that copy of the file.
`git status` would have answered it in one command, before any of it.

The related lesson: `npm run build` was run five or six times for routine
verification while the dev server was live, which is the known hazard in this
repo. `tsc --noEmit` and `lint` cover almost everything and touch nothing.

## Left out on purpose

**Cropping or a focal point.** `object-cover` centres the image. Storing a
focal point needs a new column on `users`, `bands` and `projects` — so a
hand-written migration — plus drag UI. Deferred deliberately rather than built
in the week before a test round.

**`next/image`.** Everything is still a bare `<img>`. Switching needs the R2
host in `images.remotePatterns`, and is the reason to prefer a custom domain
over the r2.dev address eventually.

**Uploading a picture while creating a band or project.** Neither has an id
yet, and the presign route authorises against one. Both flows already land on
the page where the upload is.

**The Back button on `/bands`.** It looks right now, but it is still the one
placement that is arguable: you reach that page from the navbar and leave the
same way.

**The nine unused imports on the band page** were cleared, but `selectedDate`
went with them — the page kept a date and branched on it to list "the day you
clicked", while `Home.tsx` owns the calendar and its own selection. Nothing
could set it, so the branch never ran. Behaviour is unchanged.

Reasoning in `docs/decisions/profile-editing.md`.
