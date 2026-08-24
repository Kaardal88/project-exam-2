import { Hono } from "hono";
import { authRoutes } from "@/server/auth/auth.routes";
import { handle } from "hono/vercel";
import { usersRoutes } from "@/server/users/users.routes";
import { bandsRoutes } from "@/server/bands/bands.routes";
import { projectsRoutes } from "@/server/projects/projects.routes";
import { songsRoutes } from "@/server/songs/songs.routes";
import { stemsRoutes } from "@/server/songs/stems.routes";
import { feedbackRoutes } from "@/server/feedback/feedback.routes";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.route("/auth", authRoutes);
app.route("/users", usersRoutes);
app.route("/bands", bandsRoutes);
app.route("/projects", projectsRoutes);
app.route("/songs", songsRoutes);
// A second router on the same base path. Hono matches in registration order,
// so the two must never define the same route -- see stems.routes.ts.
app.route("/songs", stemsRoutes);
app.route("/feedback", feedbackRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
