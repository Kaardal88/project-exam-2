import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  unique,
  uniqueIndex,
  index,
  integer,
  boolean,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    username: varchar("username", {
      length: 255,
    }).notNull(),

    /**
     * URL identifier, e.g. /user/adrian-2. Deliberately separate from username:
     * two musicians are allowed to both be called "Adrian", but only one of them
     * can own /user/adrian. Display names collide; addresses must not.
     *
     * Nullable because it was added to a table that already had rows -- a UNIQUE
     * NOT NULL column cannot be added with a default. Backfilled by
     * scripts/backfill-user-handles.ts and always set on registration, and the
     * UI falls back to the user id the same way band links fall back to band id.
     */
    handle: varchar("handle", {
      length: 255,
    }).unique(),

    email: varchar("email", {
      length: 255,
    })
      .notNull()
      .unique(),

    password_hash: varchar("password_hash", {
      length: 255,
    }).notNull(),

    image_url: text("image_url"),

    header_image_url: text("header_image_url"),

    tags: text("tags")
      .array()
      .default(sql`'{}'::text[]`),

    /**
     * Reads the tester feedback inbox. Nothing else -- not other bands, not
     * other projects, not anyone's files. Testers consented to sending feedback,
     * not to being overseen.
     *
     * No route writes this and no schema accepts it: updateUserSchema is a
     * z.object, which strips unknown keys, and updateUser names each column
     * explicitly rather than spreading a body. The only way to set it is
     * scripts/grant-admin.ts, run by hand against the database.
     *
     * It is deliberately absent from the JWT. A token lasts seven days, so
     * authority carried inside one would outlive its own revocation; every gated
     * route re-reads this column instead.
     */
    is_admin: boolean("is_admin").notNull().default(false),
  },
  (table) => ({
    /**
     * At most one admin can exist on the platform, enforced by Postgres rather
     * than by anyone remembering. A partial unique index over a single value
     * means the second row trying to be true is rejected outright -- so a
     * mistake, a bad migration or a future misunderstanding cannot quietly
     * hand this out twice.
     */
    singleAdmin: uniqueIndex("users_single_admin_idx")
      .on(table.is_admin)
      .where(sql`${table.is_admin} = true`),
  }),
);

export const bands = pgTable("bands", {
  id: uuid("id").defaultRandom().primaryKey(),

  band_name: varchar("band_name", {
    length: 255,
  }).notNull(),

  bio: text("bio"),

  image_url: text("image_url"),

  header_image_url: text("header_image_url"),

  slug: varchar("slug", {
    length: 255,
  })
    .notNull()
    .unique(),

  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),

  // "public" | "unlisted" | "private" -- see lib/bandVisibility.ts.
  // Defaults to public so existing rows keep the behaviour they had before
  // this column existed.
  visibility: varchar("visibility", { length: 20 })
    .notNull()
    .default("public"),

  created_at: timestamp("created_at").defaultNow(),
  country: text("country"),
  genre: text("genre"),
  spotify_url: text("spotify_url"),
  bandcamp_url: text("bandcamp_url"),
  youtube_url: text("youtube_url"),
  tidal_url: text("tidal_url"),
  instagram_url: text("instagram_url"),
  facebook_url: text("facebook_url"),
  tiktok_url: text("tiktok_url"),
  website_url: text("website_url"),
});

/**
 * Slugs a band used to have, so renaming does not break shared links.
 *
 * The slug column is UNIQUE here as well as on bands, which is what stops a
 * retired slug from being handed to a different band later: an old link must
 * never quietly start resolving to someone else. ensureUniqueSlug() checks
 * this table too.
 */
export const band_slug_history = pgTable("band_slug_history", {
  id: uuid("id").defaultRandom().primaryKey(),

  band_id: uuid("band_id")
    .notNull()
    .references(() => bands.id, { onDelete: "cascade" }),

  slug: varchar("slug", { length: 255 }).notNull().unique(),

  created_at: timestamp("created_at").defaultNow(),
});

export const band_slug_historyRelations = relations(
  band_slug_history,
  ({ one }) => ({
    band: one(bands, {
      fields: [band_slug_history.band_id],
      references: [bands.id],
    }),
  }),
);

export const band_members = pgTable(
  "band_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    band_id: uuid("band_id")
      .notNull()
      .references(() => bands.id, { onDelete: "cascade" }),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: varchar("role", {
      length: 255,
    }).notNull(),

    /**
     * "pending" | "accepted" | "declined" -- see lib/inviteStatus.ts.
     *
     * Defaults to "accepted", not "pending", so that adding this column left
     * every existing membership working exactly as before with no backfill
     * step. The invite route sets "pending" explicitly, and band creation sets
     * "accepted" explicitly, so nothing relies on the default being right.
     *
     * getMembership() filters on this. A declined row is kept rather than
     * deleted, so a leader can see the answer and re-invite by flipping it
     * back to pending.
     */
    status: varchar("status", {
      length: 20,
    })
      .notNull()
      .default("accepted"),

    invited_by: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),

    invited_at: timestamp("invited_at").defaultNow(),

    image_url: text("image_url"),

    joined_at: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    uniqueBandUser: unique().on(table.band_id, table.user_id),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  band_members: many(band_members),
}));

export const bandsRelations = relations(bands, ({ many }) => ({
  members: many(band_members),
  projects: many(projects),
}));

export const band_membersRelations = relations(band_members, ({ one }) => ({
  band: one(bands, {
    fields: [band_members.band_id],
    references: [bands.id],
  }),
  user: one(users, {
    fields: [band_members.user_id],
    references: [users.id],
  }),
}));

export const band_events = pgTable("band_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  band_id: uuid("band_id")
    .notNull()
    .references(() => bands.id, { onDelete: "cascade" }),

  // Nullable so a band's calendar survives the member who created an event
  // deleting their account. Rendered as "Deleted user" in the UI.
  user_id: uuid("user_id").references(() => users.id, {
    onDelete: "set null",
  }),

  title: varchar("title", {
    length: 255,
  }).notNull(),

  description: text("description"),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date"),
  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_at: timestamp("created_at").defaultNow(),
});

export const user_events = pgTable("user_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  title: varchar("title", {
    length: 255,
  }).notNull(),

  description: text("description"),
  start_date: timestamp("start_date").notNull(),
  end_date: timestamp("end_date"),

  created_at: timestamp("created_at").defaultNow(),
});

export const user_eventsRelations = relations(user_events, ({ one }) => ({
  user: one(users, {
    fields: [user_events.user_id],
    references: [users.id],
  }),
}));

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),

  band_id: uuid("band_id")
    .notNull()
    .references(() => bands.id, { onDelete: "cascade" }),

  type: varchar("type", {
    length: 20,
  }).notNull(),

  title: varchar("title", {
    length: 255,
  }).notNull(),

  description: text("description"),

  cover_image_url: text("cover_image_url"),

  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_at: timestamp("created_at").defaultNow(),
});

/**
 * People invited to work on a single project without joining the band.
 *
 * Deliberately a separate table from band_members rather than a nullable
 * project column on it. A guest belongs to an album or a single, not to the
 * whole band, so they must not turn up in the band's line-up -- and keeping
 * them out of band_members means that takes no filtering at all. It also keeps
 * (band_id, user_id) unique on band_members meaningful, which a guest working
 * on two projects for the same band would otherwise break.
 *
 * Access is resolved in server/projects/access.ts, which accepts either a band
 * membership or a row here.
 */
export const project_collaborators = pgTable(
  "project_collaborators",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    project_id: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),

    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    /**
     * What they are here as -- see lib/collaboratorRoles.ts. A label for now,
     * not a permission: a collaborator has the same rights as a band member
     * inside songDashboard until there is a reason to narrow them.
     */
    role: varchar("role", { length: 40 }).notNull(),

    /** Same vocabulary as band_members.status -- see lib/inviteStatus.ts. */
    status: varchar("status", { length: 20 }).notNull().default("pending"),

    invited_by: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),

    invited_at: timestamp("invited_at").defaultNow(),

    joined_at: timestamp("joined_at"),
  },
  (table) => ({
    uniqueProjectUser: unique().on(table.project_id, table.user_id),
  }),
);

export const project_collaboratorsRelations = relations(
  project_collaborators,
  ({ one }) => ({
    project: one(projects, {
      fields: [project_collaborators.project_id],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [project_collaborators.user_id],
      references: [users.id],
    }),
  }),
);

export const songs = pgTable("songs", {
  id: uuid("id").defaultRandom().primaryKey(),

  project_id: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),

  title: varchar("title", {
    length: 255,
  }).notNull(),

  status: varchar("status", {
    length: 20,
  })
    .notNull()
    .default("wip"),

  track_number: integer("track_number"),

  bpm: integer("bpm"),

  key: varchar("key", { length: 20 }),

  time_signature: varchar("time_signature", { length: 20 }),

  /**
   * The single-file mixdown of the current version, when there is one.
   *
   * Once a song is a set of stems there is no one file that *is* the audio, so
   * this stops being the pointer and becomes a cache: the take sitting in the
   * "mix" slot of current_version_id, written only by the commit path in
   * server/songs/versions.service.ts and nowhere else. It is derivable, and it
   * is materialised here so a song list does not need three joins.
   *
   * Null for a song built from stems with no mix slot. Consumers that want one
   * file say "stems only" rather than drawing a broken player.
   */
  audio_url: text("audio_url"),

  artwork_url: text("artwork_url"),

  /**
   * main. The version this song currently is.
   *
   * Stored rather than derived, unlike the pointer it replaces: with several
   * stems there is nothing to derive it *from*. Every read of "what does this
   * song sound like" starts here, which is why it is denormalised onto the row
   * rather than found with MAX(version_number) on the most-visited page in the
   * app.
   *
   * set null rather than cascade: losing the current version must not delete
   * the song. DELETE of the current version is refused by the route anyway.
   *
   * The `: AnyPgColumn` annotation below is load-bearing, not decoration.
   * songs points at song_versions and song_versions points back at songs, and
   * without an explicit return type TypeScript cannot resolve either table --
   * both collapse to `any`, and the damage spreads to every file that queries
   * the schema at all.
   */
  current_version_id: uuid("current_version_id").references(
    (): AnyPgColumn => song_versions.id,
    { onDelete: "set null" },
  ),

  created_by: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_at: timestamp("created_at").defaultNow(),

  updated_at: timestamp("updated_at").defaultNow(),
});

export const song_comments = pgTable("song_comments", {
  id: uuid("id").defaultRandom().primaryKey(),

  song_id: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  // Nullable so a band keeps its feedback history when an author deletes
  // their account. Rendered as "Deleted user" in the UI.
  author_id: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),

  timestamp_seconds: integer("timestamp_seconds").notNull(),

  body: text("body").notNull(),

  assignee_id: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),

  status: varchar("status", { length: 20 }).notNull().default("open"),

  created_at: timestamp("created_at").defaultNow(),

  resolved_at: timestamp("resolved_at"),
});

export const song_tasks = pgTable("song_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),

  song_id: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 255 }).notNull(),

  assignee_id: uuid("assignee_id").references(() => users.id, {
    onDelete: "set null",
  }),

  due_date: timestamp("due_date"),

  is_done: boolean("is_done").notNull().default(false),

  created_at: timestamp("created_at").defaultNow(),
});

export const song_notes = pgTable("song_notes", {
  id: uuid("id").defaultRandom().primaryKey(),

  song_id: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  title: varchar("title", { length: 255 }).notNull(),

  body: text("body").notNull(),

  kind: varchar("kind", { length: 20 }).notNull().default("note"),

  published_by: uuid("published_by").references(() => users.id, {
    onDelete: "set null",
  }),

  updated_by: uuid("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_at: timestamp("created_at").defaultNow(),

  updated_at: timestamp("updated_at").defaultNow(),
});

export const song_files = pgTable("song_files", {
  id: uuid("id").defaultRandom().primaryKey(),

  song_id: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  filename: varchar("filename", { length: 255 }).notNull(),

  category: varchar("category", { length: 20 }).notNull(),

  file_url: text("file_url"),

  uploaded_by: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_at: timestamp("created_at").defaultNow(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  band: one(bands, {
    fields: [projects.band_id],
    references: [bands.id],
  }),
  songs: many(songs),
  collaborators: many(project_collaborators),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
  project: one(projects, {
    fields: [songs.project_id],
    references: [projects.id],
  }),
  /**
   * The slot registry and the commit history. The *current* version is
   * deliberately not a relation here: songs.current_version_id would pair
   * ambiguously with `versions` below, and every route that wants it already
   * has the id to fetch it by.
   */
  stems: many(song_stems),
  versions: many(song_versions),
}));

export const song_commentsRelations = relations(song_comments, ({ one }) => ({
  author: one(users, {
    fields: [song_comments.author_id],
    references: [users.id],
  }),
  assignee: one(users, {
    fields: [song_comments.assignee_id],
    references: [users.id],
  }),
}));

export const song_tasksRelations = relations(song_tasks, ({ one }) => ({
  assignee: one(users, {
    fields: [song_tasks.assignee_id],
    references: [users.id],
  }),
}));

export const song_notesRelations = relations(song_notes, ({ one }) => ({
  publisher: one(users, {
    fields: [song_notes.published_by],
    references: [users.id],
  }),
  editor: one(users, {
    fields: [song_notes.updated_by],
    references: [users.id],
  }),
}));

export const song_filesRelations = relations(song_files, ({ one }) => ({
  uploader: one(users, {
    fields: [song_files.uploaded_by],
    references: [users.id],
  }),
}));

export const song_comment_events = pgTable("song_comment_events", {
  id: uuid("id").defaultRandom().primaryKey(),

  comment_id: uuid("comment_id")
    .notNull()
    .references(() => song_comments.id, { onDelete: "cascade" }),

  // Nullable so the comment timeline survives the actor deleting their account.
  actor_id: uuid("actor_id").references(() => users.id, {
    onDelete: "set null",
  }),

  event_type: varchar("event_type", { length: 20 }).notNull(),

  from_value: varchar("from_value", { length: 255 }),

  to_value: varchar("to_value", { length: 255 }),

  created_at: timestamp("created_at").defaultNow(),
});

export const song_comment_eventsRelations = relations(
  song_comment_events,
  ({ one }) => ({
    actor: one(users, {
      fields: [song_comment_events.actor_id],
      references: [users.id],
    }),
  }),
);

/**
 * Every audio file ever uploaded for a song, newest and oldest alike.
 *
 * songs.audio_url stays the pointer to the current version, so playback,
 * /audio-url and the key validation all keep working untouched. Which row is
 * current is *derived* -- r2_key === song.audio_url -- rather than stored as a
 * flag here, so the two can never drift into disagreeing.
 *
 * The table exists so that contributing and deciding can be different acts. A
 * guest musician needs to upload their take; only a band leader should get to
 * say which take is the song. Before this, "replace the audio" was one write
 * that overwrote the pointer and deleted the old object, which made those two
 * things inseparable and lost the previous take for good.
 */
export const song_audio_versions = pgTable("song_audio_versions", {
  id: uuid("id").defaultRandom().primaryKey(),

  song_id: uuid("song_id")
    .notNull()
    .references(() => songs.id, { onDelete: "cascade" }),

  /** R2 object key, always scoped songs/<song_id>/audio/... */
  r2_key: text("r2_key").notNull(),

  /** "Kim's guitar overdub" — what a reader needs to tell two takes apart. */
  label: varchar("label", { length: 255 }).notNull(),

  /** Optional longer note: what changed, what to listen for. */
  note: text("note"),

  // Nullable so the history survives the uploader deleting their account,
  // the same way song_files and song_comment_events do.
  uploaded_by: uuid("uploaded_by").references(() => users.id, {
    onDelete: "set null",
  }),

  created_at: timestamp("created_at").defaultNow(),
});

export const song_audio_versionsRelations = relations(
  song_audio_versions,
  ({ one }) => ({
    song: one(songs, {
      fields: [song_audio_versions.song_id],
      references: [songs.id],
    }),
    uploader: one(users, {
      fields: [song_audio_versions.uploaded_by],
      references: [users.id],
    }),
  }),
);

/**
 * Tester feedback, and the developer's answer to it.
 *
 * One question, one answer. Not a thread: five testers over a short round, and
 * anything needing real back-and-forth has a channel outside the app. If that
 * turns out too thin, the way forward is a messages table underneath this one,
 * not a rebuild of it.
 *
 * Only the developer reads the whole table. A tester sees their own rows and
 * nothing else -- scoped by author_id on the server, never filtered in the
 * client.
 */
export const feedback = pgTable("feedback", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Nullable so a submission survives its author deleting their account. The
  // report stays useful; it just stops being attributable.
  author_id: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),

  // "bug" | "missing" | "worked" -- see lib/feedbackCategories.ts.
  category: varchar("category", { length: 20 }).notNull(),

  body: text("body").notNull(),

  /**
   * The path they were on when they opened the form, captured automatically.
   * "It crashed" and "it crashed on /songs?songId=..." are different reports,
   * and nobody remembers to include the second one.
   */
  page: varchar("page", { length: 255 }),

  // "new" | "seen" | "resolved" -- see lib/feedbackCategories.ts.
  status: varchar("status", { length: 20 }).notNull().default("new"),

  /** The developer's answer, shown to the tester who sent it. */
  reply: text("reply"),

  replied_at: timestamp("replied_at"),

  /**
   * When the author last looked at the reply.
   *
   * A badge that counts every answer would never clear, and a badge that never
   * clears stops being read. This is what makes "new" mean something: set when
   * the author opens their feedback page, and cleared again whenever the reply
   * is edited, so a changed answer is new again.
   */
  reply_seen_at: timestamp("reply_seen_at"),

  created_at: timestamp("created_at").defaultNow(),
});

export const feedbackRelations = relations(feedback, ({ one }) => ({
  author: one(users, {
    fields: [feedback.author_id],
    references: [users.id],
  }),
}));

/**
 * Stems: a song is layers, and a version is a set of them.
 *
 * See docs/decisions/stems-and-versioning.md for the reasoning. The short
 * version, because it is the part that is easy to get wrong later:
 *
 * A version is a **flat, independent** set of stem references. Creating v2
 * copies v1's rows -- copies of pointers, not of audio -- and overwrites only
 * the slot that changed. That copy happens **on write**, never on read.
 * Resolving a missing slot by walking up to a parent version would mean that
 * fixing a stem in v1 changes what v2, v3 and v4 sound like, including a mix
 * somebody has already approved.
 *
 * The audio is still shared across versions by reference, so only the small
 * pointer rows are duplicated. A version costs four rows, not four files.
 */

/**
 * One slot in a song: "Lead vocal", "Gtr L", "Full mix".
 *
 * A registry of names and colors. It does **not** say what is in the
 * arrangement -- the version does. A slot that no version references is simply
 * not in the song, which is also how a layer is removed: commit a version that
 * omits it. There is no delete path for "take this out of the song".
 */
export const song_stems = pgTable(
  "song_stems",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    song_id: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),

    /** The band's own name for the slot. */
    name: varchar("name", { length: 80 }).notNull(),

    /** See lib/stemKinds.ts -- drives the icon and the default color. */
    kind: varchar("kind", { length: 40 }).notNull(),

    /**
     * #rrggbb chosen by the band. Null means "nobody has chosen", not "no
     * color": stemColor() falls back to the kind's default, so a lane is never
     * colorless and the picker never has to be opened.
     *
     * This is data, not palette. It is rendered as an inline style, never as a
     * Tailwind class, so it does not put a new value into the design system --
     * and it is used as a lane accent only, never as a text color, because a
     * band that picks a near-black would otherwise make its own stem
     * unreadable on a dark background.
     */
    color: varchar("color", { length: 7 }),

    sort_order: integer("sort_order").notNull().default(0),

    created_by: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    bySong: index("song_stems_song_id_idx").on(table.song_id),
  }),
);

/**
 * The audio itself. One row per file anyone has handed in for a slot.
 *
 * Uploading writes a row here and does nothing else -- anyone with project
 * access, guests included, and nothing audible changes. That is the same split
 * song_audio_versions was built on: contributing and deciding are different
 * acts, and a guest musician who cannot hand in what they played is no use to
 * anybody while one who can silently overrule the band is worse.
 */
export const song_stem_takes = pgTable(
  "song_stem_takes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // Denormalised from the stem. Every route checks "does this belong to this
    // song" before acting, and every other song_* table carries song_id for
    // exactly that reason.
    song_id: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),

    stem_id: uuid("stem_id")
      .notNull()
      .references(() => song_stems.id, { onDelete: "cascade" }),

    /** Always songs/<song_id>/stems/... -- passes isKeyForSong() unchanged. */
    r2_key: text("r2_key").notNull(),

    label: varchar("label", { length: 255 }).notNull(),

    note: text("note"),

    /**
     * Format-agnostic from day one even though validation only admits mp3
     * today. Adding wav later is then a validation change, not a schema
     * change -- which is the whole reason these four columns exist before
     * anything writes anything but "mp3" into them.
     */
    format: varchar("format", { length: 10 }).notNull().default("mp3"),
    duration_seconds: integer("duration_seconds"),
    sample_rate: integer("sample_rate"),
    bit_depth: integer("bit_depth"),
    byte_size: integer("byte_size"),

    /**
     * The compressed proxy the player always uses. Null while the master is
     * already mp3, which is every take in this round.
     *
     * When wav arrives behind a subscription plan: the master stays in r2_key,
     * a proxy is generated asynchronously into this column, playback reads
     * proxy_r2_key ?? r2_key, and downloading for mix always reads r2_key. A
     * band without wav access has no proxy and needs no extra step.
     *
     * A column rather than a second take row pointed at by a self-reference: a
     * proxy that is its own row turns up in every "takes in this slot" list
     * and has to be filtered out of every query that touches one.
     */
    proxy_r2_key: text("proxy_r2_key"),

    // Nullable so the history survives the uploader deleting their account,
    // the same way song_files and song_audio_versions do.
    uploaded_by: uuid("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),

    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    bySong: index("song_stem_takes_song_id_idx").on(table.song_id),
    byStem: index("song_stem_takes_stem_id_idx").on(table.stem_id),
  }),
);

/**
 * A commit on main.
 *
 * Not a branch. Branching means two versions living side by side that will
 * later be merged; this is one sequence of states of the whole arrangement,
 * which in git terms is a commit history on main with no branches at all.
 * "Rhythm guitar v1" is not a branch, it is a commit message -- which is what
 * `label` holds, with version_number playing the part of the hash.
 *
 * The rule that keeps it linear: a new version always copies from
 * songs.current_version_id, never from an arbitrary version. Restoring an old
 * version therefore writes a *new* version rather than moving the pointer
 * backwards, the same shape as git revert.
 */
export const song_versions = pgTable(
  "song_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    song_id: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),

    version_number: integer("version_number").notNull(),

    /** "Vocal ref 2" -- what a reader actually sees. */
    label: varchar("label", { length: 255 }).notNull(),

    note: text("note"),

    /**
     * Sent to mix. A timestamp and an actor rather than a boolean, the same
     * shape as song_comments.resolved_at and feedback.replied_at -- it carries
     * who and when for free, and a locked version cannot be deleted.
     */
    locked_at: timestamp("locked_at"),
    locked_by: uuid("locked_by").references(() => users.id, {
      onDelete: "set null",
    }),

    created_by: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    /**
     * Also the lookup index for "the versions of this song": song_id is
     * leftmost, so a separate index on it would be a second write cost for a
     * read Postgres can already serve.
     */
    uniqueNumber: unique().on(table.song_id, table.version_number),
  }),
);

/**
 * The flat snapshot: which take was in which slot, in this version.
 *
 * The most-read table in the feature and the one that enforces the model.
 */
export const song_version_stems = pgTable(
  "song_version_stems",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    song_version_id: uuid("song_version_id")
      .notNull()
      .references(() => song_versions.id, { onDelete: "cascade" }),

    song_id: uuid("song_id")
      .notNull()
      .references(() => songs.id, { onDelete: "cascade" }),

    /**
     * restrict, not cascade: deleting a slot some version still uses would
     * silently drop a layer out of an arrangement that has already been
     * listened to and signed off on.
     */
    stem_id: uuid("stem_id")
      .notNull()
      .references(() => song_stems.id, { onDelete: "restrict" }),

    /**
     * restrict, and this is the important one. A take some version points at
     * cannot be deleted, because deleting it would change what an already
     * approved mix sounds like -- the exact thing the flat-copy design exists
     * to prevent. set null would be worse than either: a snapshot row with a
     * hole in it is history that quietly changed.
     *
     * The route checks first and answers 409 naming the versions that use it.
     * This is the backstop under that check, not a substitute for it.
     */
    take_id: uuid("take_id")
      .notNull()
      .references(() => song_stem_takes.id, { onDelete: "restrict" }),
  },
  (table) => ({
    /** One active take per slot per version, enforced by Postgres. */
    oneTakePerSlot: unique().on(table.song_version_id, table.stem_id),

    /** "Does any version point at this take?" -- run on every take deletion. */
    byTake: index("song_version_stems_take_id_idx").on(table.take_id),
  }),
);

export const song_stemsRelations = relations(song_stems, ({ one, many }) => ({
  song: one(songs, {
    fields: [song_stems.song_id],
    references: [songs.id],
  }),
  takes: many(song_stem_takes),
  creator: one(users, {
    fields: [song_stems.created_by],
    references: [users.id],
  }),
}));

export const song_stem_takesRelations = relations(
  song_stem_takes,
  ({ one }) => ({
    stem: one(song_stems, {
      fields: [song_stem_takes.stem_id],
      references: [song_stems.id],
    }),
    uploader: one(users, {
      fields: [song_stem_takes.uploaded_by],
      references: [users.id],
    }),
  }),
);

export const song_versionsRelations = relations(
  song_versions,
  ({ one, many }) => ({
    song: one(songs, {
      fields: [song_versions.song_id],
      references: [songs.id],
    }),
    creator: one(users, {
      fields: [song_versions.created_by],
      references: [users.id],
    }),
    locker: one(users, {
      fields: [song_versions.locked_by],
      references: [users.id],
    }),
    stems: many(song_version_stems),
  }),
);

export const song_version_stemsRelations = relations(
  song_version_stems,
  ({ one }) => ({
    version: one(song_versions, {
      fields: [song_version_stems.song_version_id],
      references: [song_versions.id],
    }),
    stem: one(song_stems, {
      fields: [song_version_stems.stem_id],
      references: [song_stems.id],
    }),
    take: one(song_stem_takes, {
      fields: [song_version_stems.take_id],
      references: [song_stem_takes.id],
    }),
  }),
);
