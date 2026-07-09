# Session Summary

## 1. Architecture review (read-only)

Reviewed the existing codebase: Next.js App Router (`app/pages/**`) + a single Hono
app mounted at `app/api/[[...route]]/route.ts`, Drizzle ORM over Neon Postgres
(`server/db/schema.ts`), JWT auth stored in `localStorage` with no server-side
session/cookie layer and no root `middleware.ts` (auth is gated per-page in
`useEffect` and per-route via Hono's `requireAuth`). Permission checks are inline
per handler, keyed off `band_members.role === "band_leader"` — no shared
`can()`/role-enum helper. Noted one pre-existing gap: `PUT /api/bands/:id` only
checks membership, not role, so any member can edit a band profile even though the
UI hides that button from non-leaders.

Confirmed `songDashboard` was a static mock with no backing data, and identified
`Albums`/`Singles`/`WIP`/`Finished` band-profile tabs as placeholder components
meant to eventually list real content.

## 2. Project/release flow — design

Proposed (and got sign-off on) the shape for a new "project" concept sitting
between a band and its songs:

- **Tables**: `projects` (band_id, type: `"album"|"single"`, title, description,
  cover_image_url) and `songs` (project_id, title, status: `"wip"|"finished"`,
  track_number).
- **Permissions**: create/edit/delete a project = `band_leader` only; add a song
  to an album = any band member (collaborative, confirmed by user); view = any
  band member.
- **Routes**: `bandProfile` (existing) → `projectDetails/[id]` (new) →
  `songDashboard?songId=...` (existing page, extended).
- Explicitly deferred: audio upload, version control, BPM/key/time signature,
  tasks/comments/notes, responsible-member assignment — these belong to the next
  phase (the actual song workspace/dashboard build-out).

## 3. MVP implementation (shipped this session)

**Schema** (`server/db/schema.ts`, pushed live via `drizzle-kit push`):

- `projects` — band_id, type, title, description, cover_image_url, created_by,
  created_at.
- `songs` — project_id, title, status (default `"wip"`), track_number,
  created_by, created_at.
- Relations wired: `bands.projects`, `projects.songs`, `projects.band`,
  `songs.project`.

**API**:

- `server/bands/bands.routes.ts` — added `GET/POST /:id/projects`
  (leader-only create; creating a `"single"` auto-creates its one song).
- `server/projects/projects.routes.ts` (new) — `GET/PUT /:id`,
  `POST /:id/songs`.
- `server/songs/songs.routes.ts` (new) — `GET/PUT /:id`.
- Mounted `projectsRoutes` at `/api/projects` and `songsRoutes` at `/api/songs`
  in `app/api/[[...route]]/route.ts`.

**UI**:

- `components/bandProfile/NewProjectModal.tsx` (new) — Album/Single picker +
  title/description form, wired to the existing "New Project" button on
  `app/pages/bandProfile/page.tsx` (previously a dead link straight into the
  mock dashboard).
- `bandProfile/page.tsx` now fetches the band's projects once and passes
  filtered lists into `Albums.tsx`/`Singles.tsx`, replacing their static
  placeholder text with real project cards linking into `projectDetails`.
- `app/pages/projectDetails/[id]/page.tsx` (new) — project header, song list
  with status badges, "Add song" (album-type projects only) via
  `components/projectDetails/AddSongModal.tsx` (new).
- `app/pages/songDashboard/page.tsx` — now reads `songId` from the query
  string, fetches the real song via `GET /api/songs/:id`, shows its title/status,
  and its "Back" link now returns to the song's `projectDetails` page instead of
  straight to the band profile. Everything else on that page (the feature-tag
  mock, description) is left as-is — it's the placeholder for the next phase.

Verified with `npx tsc --noEmit` (clean) after all changes.

## 4. Security fix

`drizzle.config.ts` had a leftover `console.log(process.env.DATABASE_URL)` that
printed the live Neon connection string (with credentials) to stdout on every
`drizzle-kit` invocation — it fired during this session's `drizzle-kit push` and
the string is visible in that terminal output. Removed the line. **If this
session's transcript is ever shared, treat that DB password as exposed and
consider rotating it.**

## Not done / explicitly out of scope

- The actual song workspace (audio upload, version control, BPM/key/time
  signature, tasks, comments, notes, responsible-member assignment) —
  next phase, to be designed separately.
- `WIP`/`Finished` band-profile tabs are still static placeholders (would need a
  cross-project "all songs by status" query not covered by this MVP).
- The pre-existing `PUT /api/bands/:id` leader-only gap was noted but not fixed
  (out of scope for this task).
