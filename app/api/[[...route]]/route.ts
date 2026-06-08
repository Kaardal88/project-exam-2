import { Hono } from "hono";
import { authRoutes } from "@/server/auth/auth.routes";
import { handle } from "hono/vercel";
import { usersRoutes } from "@/server/users/users.routes";
import { bandsRoutes } from "@/server/bands/bands.routes";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.route("/auth", authRoutes);
app.route("/users", usersRoutes);
app.route("/bands", bandsRoutes);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
