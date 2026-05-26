"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTOR_COOKIE } from "@/server/actor";
import { db } from "@/server/db";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function setActor(id: string): Promise<void> {
  const account = await db.account.findUnique({ where: { id } });
  if (!account) throw new Error(`No account with id ${id}`);
  const store = await cookies();
  store.set(ACTOR_COOKIE, id, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: THIRTY_DAYS,
    path: "/",
  });
  revalidatePath("/", "layout");
}
