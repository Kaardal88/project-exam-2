// src/server/users/users.schemas.ts
import { z } from "zod";
import { userTagValues } from "@/lib/userTags";
import { isStorableImageUrl, IMAGE_URL_MAX_LENGTH } from "@/lib/imageUrl";

/** Shared with the band update route -- see lib/imageUrl.ts for the why. */
const imageUrlSchema = z
  .string()
  .max(IMAGE_URL_MAX_LENGTH)
  .refine(isStorableImageUrl, {
    message: "Image URL must start with http:// or https://",
  });

export const updateUserSchema = z.object({
  username: z.string().min(2).max(50).optional(),
  image_url: imageUrlSchema.optional(),
  header_image_url: imageUrlSchema.optional(),
  tags: z.array(z.enum(userTagValues)).optional(),
  /**
   * cca2, matching bands.country. Not checked against the world-countries list
   * on the server: that list is a megabyte of JSON and the column is a filter
   * key, not a permission. A two-character cap is enough to keep it a code.
   *
   * Nullable so "no country" is something a person can go back to. Absent
   * means unchanged -- drizzle's .set() drops undefined keys.
   */
  country: z.string().max(2).nullable().optional(),
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
