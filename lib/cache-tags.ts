import "server-only";
import { refresh, updateTag } from "next/cache";
import { requireUser } from "./auth";

/** Cache tags for the per-café menu and settings caches in lib/data.ts. */
export const menuTag = (userId: string) => `menu:${userId}`;
export const settingsTag = (userId: string) => `settings:${userId}`;

/** Call from a server action after changing the menu: clears this café's cached menu and refreshes the page. */
export async function menuChanged() {
  const user = await requireUser();
  updateTag(menuTag(user.id));
  refresh();
}

/** Call from a server action after changing the café settings or logo. */
export async function settingsChanged() {
  const user = await requireUser();
  updateTag(settingsTag(user.id));
  refresh();
}
