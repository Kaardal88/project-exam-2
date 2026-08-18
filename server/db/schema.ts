import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  unique,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),

  username: varchar("username", {
    length: 255,
  }).notNull(),

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
});

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

  audio_url: text("audio_url"),

  artwork_url: text("artwork_url"),

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
}));

export const songsRelations = relations(songs, ({ one }) => ({
  project: one(projects, {
    fields: [songs.project_id],
    references: [projects.id],
  }),
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
