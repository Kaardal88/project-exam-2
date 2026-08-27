# StemLock

## Project Overview

StemLock (formerly BandStructure) is a modern web platform designed for musicians, bands, producers, managers and other music industry professionals. But all hobby bands, home-studio warriors and garage bands are very welcome too.

The goal is to provide one place where a band can organize everything related to their music project, from members and releases to planning, collaboration and communication.

Rather than being another social media platform, StemLock is intended to become an internal workspace for creative teams while still allowing selected information to be shared publicly.

The project began as a school exam but is intended to continue as a long-term portfolio project and potentially evolve into a real product.

---

# Target Audience

StemLock is built for:

- Bands
- Solo artists
- Producers
- Mixing and mastering engineers
- Session musicians
- Songwriters
- Managers
- Labels (future)
- Studios (future)

Anyone involved in creating or managing music should be able to collaborate within the platform.

---

# Problems the Platform Solves

Many bands organize their work across multiple disconnected platforms.

Examples include:

- Messenger or Discord for communication
- Google Drive or Dropbox for files
- Notes apps for lyrics
- Trello, Slack or Notion for planning
- Shared calendars
- Social media for public presence

StemLock aims to collect these workflows into a single platform designed specifically for musicians.

The platform should reduce administrative work so artists can spend more time creating music.

---

# Product Vision

StemLock should become the central workspace for a music project.

Each band has its own workspace containing everything related to that band.

Members only see information they have permission to access.

Public visitors only see content intentionally shared by the band.

The platform should feel modern, clean, intuitive and enjoyable to use.

---

# Current Features

### Accounts and access

- User accounts, with handles so profiles have shareable addresses
- Session in an httpOnly cookie; password change from settings
- Band creation, member invitations you can accept or decline
- Role-based permissions enforced server-side, not by hiding buttons
- Band visibility: public, unlisted or private
- Retired band slugs keep working, so shared links do not break
- Account deletion, with a preview of what it does to each band
- Band deletion, confirmed with the band name and a password

### The band workspace

- Public band profiles: biography, country, genre, social links
- Event calendar, shared and private
- Member management and role changes
- Projects: albums and singles
- Songs, with status and track order

### The song dashboard

- Audio upload and playback with a decoded waveform
- Comments as tickets with a status and an assignee — about the song as a
  whole, about a moment in it, or about one particular version
- Comment history: who changed a status, who reassigned it
- Notes and lyrics with a rich text editor
- File management: project files, artwork, press photos, contracts
- Artwork per song, falling back to the project cover

### The studio

- **A song is stems** — separate files for the drums, a guitar, a vocal —
  decoded into one AudioContext and played together, with mute and solo per
  lane. A song that is just one finished mp3 is a song with one stem, and
  behaves identically in every other respect.
- **Versions are commits on main.** Each one is the whole arrangement at a
  moment, held as its own complete set of rows, so correcting a take in v1 can
  never change what an approved v4 sounds like.
- Uploading a take and deciding what the song is stay separate acts: anyone
  with project access can hand one in, only a band leader moves main
- Restoring an older version writes a new one rather than moving the pointer
  backwards, so the history stays a straight line
- Band-chosen colours per lane, following DAW convention by default
- Lock a version for mix — frozen as the reference, without stopping the band
- Download a version as one mixdown or as separate stems, or bounce what you
  are hearing to a single MP3 in the browser

### Collaboration

- **Project-scoped guests** — a session musician, producer, engineer or manager
  invited to one project sees nothing else the band is doing
- Guests can upload a take without being able to decide what the song is
- One inbox for band invitations and project invitations alike

### Feedback

- A feedback button on every page, for the closed test round
- Testers see their own submissions and any answer
- A single platform admin reads the inbox and replies

### Throughout

- Responsive design, dark only
- Files served from Cloudflare R2 through presigned URLs

---

# Future Plans

Potential future features include:

### Nearest at hand

- Password reset and email verification — one job, since both need an email
  provider and a verified sending domain
- Avatar and header uploads, on their own Cloudflare bucket
- SEO metadata, which was waiting on the move to cookies and is now unblocked
- Sorting and filtering on Connect and Artists
- Tablature sheets in the song dashboard
- Comments attached to a **stem** rather than to the song — "the guitar is out
  of tune at 2:14" wants to point at the guitar lane
- WAV masters behind a subscription plan, played back through an MP3 proxy;
  the schema already carries the columns for it
- A real zip of a version's stems, which needs a queue this stack does not have

### Music Management

- EPs
- Deeper song metadata beyond BPM and key

### Project Management

- Recording sessions
- Deadlines
- Checklists
- Task creation and completion (the list is read-only for now)

### Collaboration

- Internal messaging
- Narrower guest permissions, once real guests have shown what they need

### Band Administration

- Equipment inventory
- Tour planning
- Rehearsal planning
- Contact lists
- Finance overview
- Merch inventory

### Community Features

- Follow bands
- Follow musicians
- Notifications
- Activity feed
- Discovery
- Public showcases

### AI Features

Potential AI features include:

- Song organization
- Automatic tagging
- Lyric assistance
- Release planning
- Band assistant
- Smart search
- Metadata suggestions

---

# Technical Goals

The project should prioritize:

- Maintainability
- Reusable components
- Strong TypeScript typing
- Scalable architecture
- Clear folder structure
- Modular features
- Performance
- Security
- Responsive layouts

Avoid duplicate code whenever possible.

Favor reusable UI components over page-specific implementations.

---

# Long-Term Vision

StemLock is intended to grow beyond a portfolio project.

The long-term goal is to become a complete collaboration platform for musicians and creative teams.

Every new feature should fit naturally into the overall ecosystem rather than feeling like an isolated addition.

---

# Claude Instructions

When contributing to this project:

- Respect the existing architecture.
- Prefer reusable components.
- Avoid unnecessary dependencies.
- Keep components focused and maintainable.
- Follow existing naming conventions.
- Prioritize readability over clever implementations.
- Keep responsive design in mind.
- Preserve scalability for future features.
- Do not introduce breaking architectural changes unless explicitly requested.
- Explain significant architectural decisions when appropriate.
