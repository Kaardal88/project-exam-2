import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function getUsers() {
  return db.query.users.findMany();
}

export async function getUserById(id: string) {
  return db.query.users.findFirst({
    where: eq(users.id, id),
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function updateUser(
  id: string,
  data: {
    username?: string;
    image_url?: string;
    header_image_url?: string;
  },
) {
  const [updatedUser] = await db
    .update(users)
    .set({
      username: data.username,
      image_url: data.image_url,
      header_image_url: data.header_image_url,
    })
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      username: users.username,
      email: users.email,
      image_url: users.image_url,
      header_image_url: users.header_image_url,
    });

  return updatedUser;
}

export async function deleteUser(id: string) {
  return db.delete(users).where(eq(users.id, id));
}
