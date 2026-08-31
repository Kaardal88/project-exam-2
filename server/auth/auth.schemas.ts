// src/server/auth/auth.schemas.ts
import { z } from "zod";
import { userTagValues } from "@/lib/userTags";

export const registerSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.email(),
  password: z.string().min(8),
  tags: z.array(z.enum(userTagValues)).optional(),
  /**
   * cca2, matching updateUserSchema and bands.country. Optional, and "" is a
   * real answer -- the register form's blank option reads "Rather not say".
   * The route turns that into null so the Connect country filter cannot match
   * an empty string.
   */
  country: z.string().max(2).optional(),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
