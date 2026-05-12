import { Hono } from "hono";
import { authRoutes } from "@/app/server/auth/auth.routes";
import { handle } from "hono/vercel";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.route("/auth", authRoutes);

export const GET = handle(app);
export const POST = handle(app);
