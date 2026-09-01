# Pictures: from the device, and one rule for where a field lives

**Decided and built 2026-08-31, extended 2026-09-01 with album art.** Kept in
step with the code.

"Edit profile" was one button on each profile that opened one modal. The band's
held sixteen fields in a single scrolling column — name, address, visibility,
bio, country, genre, two image URLs, eight social links, and the delete button
at the bottom. The user's held five.

Two things were wrong with it, and only one of them is the modal.

## 1. The image fields asked for something nobody has

The two picture fields were **text inputs asking for a URL**. That quietly
assumed the picture was already hosted somewhere with a public address — true
for the people who built this and nobody else. A tester with a photo on their
phone had no way in at all.

So pictures upload from the device now. Which forced the interesting decision.

### Two buckets, because public and private are a bucket-level setting

Stems and song audio live in a private R2 bucket and are read through a signed
URL that expires in fifteen to thirty minutes. That is right for a band's
unreleased material and wrong for a profile picture in every respect.

`image_url` renders as a bare `<img src>` in the navbar, against every comment,
on both directory pages and on both profiles — twenty-odd call sites. A page
listing twelve bands would have to sign twelve URLs before it could paint, and
each one would rot within the hour.

R2 has no per-prefix public access. It is a property of the bucket. So there
are two:

| | private bucket | public bucket |
|---|---|---|
| holds | audio, stems, song files | avatars, header images |
| read via | `getDownloadUrl`, signed, expires | plain URL, forever |
| env | `R2_BUCKET_NAME` | `R2_STEMLOCK_PUBLIC_NAME`, `R2_STEMLOCK_PUBLIC_URL` |

They share one S3 client and one access key. `getUploadUrl` and `deleteObject`
take the bucket as an argument, defaulting to the private one so every existing
caller is untouched.

**The new bucket needs its own CORS policy.** It inherits nothing from the
private one, and a missing allowed origin fails the browser's PUT while every
other part of the app looks fine — the same failure mode that once made stems
look broken while ordinary playback worked.

### What gets stored is the URL, not the key

Songs store an R2 key and sign it on read. Profiles store the finished public
URL. That is deliberate: it means **not one of the twenty-odd `<img src>` call
sites had to change**, and the URLs people pasted in by hand before this existed
keep working alongside the uploaded ones. There is no migration, and no schema
change — the columns were already `text`.

The cost is that the stored value is not self-describing: you cannot tell from
the column whether the object is ours. That is why deletion of a replaced image
is not automatic, and why the validation below is what it is.

### The browser shrinks the picture before it uploads

The server accepts 10MB, and a photo straight off a phone is about that. Left
alone, every visitor to Connect would download twelve of them to render pictures
40px wide.

So `lib/uploadProfileImage.ts` draws the file to a canvas — 512px for an avatar,
1600px for a header — and re-encodes at quality 0.85 before the upload starts. A
9MB JPEG lands at roughly 40KB.

WebP rather than JPEG, because it keeps the alpha channel: an avatar cut out of
a PNG would otherwise get a black box behind it. A browser that cannot encode
WebP returns null from `toBlob` and falls through to JPEG.

### What the server validates, and what it does not

`isStorableImageUrl` in `lib/imageUrl.ts` requires empty or `http(s)://`, and is
applied by both update routes — through zod on the user side, by hand on the
band side, matching what each route already did.

It is deliberately **not** narrowed to our own bucket. An earlier draft checked
that the URL started with the public base plus the owner's key prefix, and it
was dropped: the hand-pasted URLs are real data on real profiles and have to
keep working, so a check that must allow any `https://` anyway is not a stricter
check — it only looks like one. What the rule actually buys is ruling out
`data:` and `javascript:`, which is worth having and is all it claims.

## 2. Where a field lives now

> **What is visible on the page is edited on the page. What identifies the
> account, or steers a directory, is edited in Settings.**

| | edited where it is shown | edited in Settings |
|---|---|---|
| **User** | avatar, header | username, country, instruments/tags |
| **Band** | avatar, header, bio, social links | name, profile URL, visibility, country, genre, deletion |
| **Project** | cover art | — |

Bands got their own page for it — `/band/[slug]/settings`, leader-only,
mirroring `/settings`. A member who follows the link is told why it is not for
them rather than being redirected, which would just look broken.

This works because `PUT /api/bands/:id` and `PUT /api/users/:id` already ignore
absent keys — drizzle's `.set()` drops `undefined`. So each surface sends only
the fields it owns, and saving the bio cannot disturb the visibility, or the
other way round. Five small saves against one route, not five routes.

Two consequences worth stating:

- **The pictures save immediately.** `EditableProfileImage` uploads and PUTs on
  its own, because there is no form around a header image and asking someone to
  find a Save button after they have watched the picture change is the odd part.
  Everything in Settings still saves on submit.
- **`ProfileSection` grew `forceOpen`.** The card collapses to five lines, which
  would clip an edit form mid-field.

### The social links became a list

Eight links were eight near-identical blocks in `SocialLinks.tsx` and eight more
text inputs in the modal. Adding inline editing on top of that would have meant
sixteen places to keep in agreement, so they read from `lib/socialPlatforms.ts`
now — display and form both. A ninth platform is one line.

## 3. Artwork belongs to the release, not the track

Added 2026-09-01. `projects.cover_image_url` already existed and was already
rendered in five places — the Albums and Singles cards, the project page, the
song page and CollabProjects — and there was no way in the app to set it. The
create route accepted it; nothing ever sent it.

It is set on the project page now, by a band leader, through the same
`EditableProfileImage` the profiles use. Not in the New project modal: a
project has no id until it exists, and the presign route authorises against
one. The modal says where the cover goes instead, since the page it sends you
to next is that page.

**Songs no longer have their own artwork.** The song page had an upload of its
own, into the *private* bucket, read back through a signed URL that expired,
falling back to the project cover when absent. That inverted the real
relationship: every track on an album shows the album's sleeve, and a single's
sleeve is the single's. So the per-song upload is gone, the song page reads the
project cover and links to where it is changed, and `PUT /api/songs/:id` no
longer accepts `artwork_url` — accepting a write to a column nothing displays
is worse than refusing it.

The `songs.artwork_url` column stays, with whatever was uploaded into it. The
change that stops reading a column is not the change that should drop it.

Covers keep more pixels than avatars (1000px square against 512): album art is
the one picture a band might want to look at properly rather than as a 40px
tile.

## What is deliberately not here

- **A crop or reposition step.** `object-cover` centres the image. A focal
  point would need a new column on `users`, `bands` and `projects` — so a
  hand-written migration — plus drag-to-position UI. Deferred deliberately on
  2026-09-01 rather than built right before a test round.
- **`next/image`.** Everything is still a bare `<img>`. Switching would need the
  R2 host in `images.remotePatterns` — and is the reason to prefer a custom
  domain over the r2.dev address later.
- **Uploading a picture while creating a band.** `/bands/new` has no band id
  yet, same constraint as a project. Creating a band already lands you on its
  profile, where the upload is, so this needs nothing further.

## What arrived later

- **Deleting the replaced object** (2026-09-01) is now done, in
  `server/uploads/replacedImages.ts`. It runs *after* the write, so a failed
  save cannot take the old picture with it, and it only deletes a URL that
  resolves to a key in our own public bucket — a hand-pasted URL is left alone.
  Failure is logged and swallowed: an orphaned object costs a fraction of a
  cent, and a 500 on a save that already succeeded costs someone their work.
  Every upload has its own uuid key, so no two rows share an object.
