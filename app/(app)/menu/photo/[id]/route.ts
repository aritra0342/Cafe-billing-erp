import { PHOTO_BUCKET, storage, tables } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth";
import { IMAGE_TYPES, imageKindOf } from "@/lib/photo";

/**
 * Serves a menu item's photo to its owner. The bucket grants no public access, so photos are read with the
 * server key after checking the photo belongs to one of the signed-in café's items.
 * A photo's file id changes whenever it's replaced, so the browser may keep it for a year.
 */
export async function GET(_request: Request, ctx: RouteContext<"/menu/photo/[id]">) {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/.test(id)) return new Response("Not found", { status: 404 });
  const owned = await tables.items.list({ queries: (q) => [q.equal("ownerId", user.id), q.equal("photo", id), q.select(["$id"]), q.limit(1)] });
  if (owned.rows.length === 0) return new Response("Not found", { status: 404 });
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await storage.getFileView({ bucketId: PHOTO_BUCKET, fileId: id }));
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const kind = imageKindOf(bytes);
  if (!kind) return new Response("Not found", { status: 404 });
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": IMAGE_TYPES[kind],
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
