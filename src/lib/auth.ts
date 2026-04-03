import { auth } from "@clerk/nextjs/server";
import { queryOne, execute, uuid } from "@/lib/db";
import type { Owner } from "@/lib/types";

export async function getOwner(): Promise<Owner | null> {
  const { userId } = await auth();
  if (!userId) return null;

  let owner = await queryOne<Owner>(
    "SELECT * FROM owners WHERE clerk_id = ?",
    [userId]
  );

  if (!owner) {
    const id = uuid();
    await execute(
      "INSERT OR IGNORE INTO owners (id, clerk_id, name, email) VALUES (?, ?, ?, ?)",
      [id, userId, "User", ""]
    );
    owner = await queryOne<Owner>(
      "SELECT * FROM owners WHERE clerk_id = ?",
      [userId]
    );
  }

  return owner;
}

export async function requireAuth(): Promise<{ userId: string; owner: Owner }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  const owner = await getOwner();
  if (!owner) throw new Error("Owner not found");
  return { userId, owner };
}
