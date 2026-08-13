// src/server/auth/auth.schemas.ts
import { z } from "zod";
import { userTagValues } from "@/lib/userTags";

export const registerSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(8),
  tags: z.array(z.enum(userTagValues)).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
