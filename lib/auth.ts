import "server-only";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export type User = { id: string };

/** The signed-in Clerk user; redirects to sign-in otherwise. Call at the top of every data read and action. */
export async function requireUser(): Promise<User> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return { id: userId };
}
