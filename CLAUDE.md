@AGENTS.md

# BandStructure

Before making changes, read:

- docs/project.md
- docs/design.md
- docs/architecture.md

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
- Auth uses JWT in localStorage (not cookies yet) — don't "fix" this unless explicitly asked.
- Reuse existing Tailwind colors already in use; don't introduce new palette values.

Commands:

- Dev: npm run dev
- Build: npm run build
- Lint: npm run lint
- Typecheck: npm run typecheck
