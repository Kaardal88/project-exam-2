import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function getUsers() {
  return db.query.users.findMany();
}

export async function getUserById(id: number | string) {
  return db.query.users.findFirst({
    where: eq(users.id, Number(id)),
  });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function updateUser(
  id: number | string,
  username: string,
  email: string,
  passwordHash: string,
) {
  return db
    .update(users)
    .set({ username, email, password_hash: passwordHash })
    .where(eq(users.id, Number(id)))
    .returning();
}

export async function deleteUser(id: number | string) {
  return db.delete(users).where(eq(users.id, Number(id)));
}
