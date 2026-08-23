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

/**
 * The current password is required, and is the whole point of the route.
 * Without it, anyone who got hold of a live session could lock the owner out
 * of their own account -- which is the attack a password change is supposed to
 * defend against, not enable.
 *
 * The minimum matches registerSchema, so a password that could be set at
 * signup can still be set here.
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
