@AGENTS.md

# StemLock

Formerly BandStructure, and the repository is still `project-exam-2`. The
wordmark reads from `NEXT_PUBLIC_APP_NAME` with a `"StemLock"` fallback —
`components/Stemlock.tsx` is the only place it is written down.

Before making changes, read:

- docs/project.md
- docs/design.md
- docs/architecture.md
- docs/decisions/ — the reasoning behind stems, versions and comments, kept in
  step with the code

If continuing previous work:

- Read the most recent file in docs/sessions/.
- Use older session summaries only if additional context is needed.

Always:

- Respect the existing architecture.
- Reuse existing components when possible.
- Keep the UI consistent with the existing design.
- Avoid unnecessary dependencies.
- Explain significant architectural decisions.

Known gotchas:

- Never use "bg-dark" or introduce light-mode variants — the app is dark-only for now.
- Auth is a JWT in an httpOnly `bs_session` cookie, sent automatically on
  same-origin requests. Never add an `Authorization` header, and never read the
  session from JavaScript — it isn't reachable. `bs_signed_in` is a readable
  hint for rendering only and must never gate access to anything.
- Reuse existing Tailwind colors already in use; don't introduce new palette values.
  Stem colours are the exception and are not a counter-example: they are *data*
  a band chose, stored per row and rendered as an inline style, never as a
  class.
- **Every HTTP method has to be re-exported from `app/api/[[...route]]/route.ts`.**
  Next.js answers 405 before Hono ever sees the request otherwise. PATCH was
  missing for a while, and the routes behind it looked correct and were simply
  unreachable.
- **Do not run `drizzle-kit generate` or `push`.** The snapshot in `drizzle/`
  is still the initial migration while the schema has drifted far past it.
  Schema changes go in a hand-written idempotent `scripts/*.ts` one-off with a
  `--dry` flag — `add-song-stems.ts` is the fullest worked example.
- **The two directory endpoints return an object, not an array**, and both are
  paged at twelve rows unless asked otherwise: `GET /api/users` gives
  `{ users, total, hasMore }` and `GET /api/bands/public` gives
  `{ bands, total, hasMore }`. Anything that searches has to pass `?q=` and let
  the server filter; filtering the response in JavaScript now searches one
  page. See `server/users/users.directory.ts` and
  `server/bands/bands.directory.ts`.
- `db.transaction()` throws on the neon-http driver. Use `db.batch()`, which
  Neon runs as one transaction, and generate ids in code so every statement is
  known up front.

Commands:

- Dev: npm run dev
- Build: npm run build
- Lint: npm run lint
- Typecheck: npm run typecheck
