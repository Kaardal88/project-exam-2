// src/server/users/users.schemas.ts
import { z } from "zod";
import { userTagValues } from "@/lib/userTags";

export const updateUserSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  image_url: z.string().optional(),
  header_image_url: z.string().optional(),
  tags: z.array(z.enum(userTagValues)).optional(),
});

export const deleteAccountSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
