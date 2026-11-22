import { timingSafeEqual } from "node:crypto";
import { tables } from "@/lib/appwrite/server";

/**
 * Called once a day by Vercel Cron (see vercel.json) so the free Appwrite project sees activity
 * and isn't paused for inactivity. Vercel sends `Authorization: Bearer $CRON_SECRET`; anything
 * else is refused, and the response never includes data.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  try {
    await tables.settings.list({ queries: (q) => [q.limit(1)] });
    return Response.json({ ok: true });
  } catch (e) {
    const err = e as { code?: number; type?: string };
    console.error("keep-alive: Appwrite request failed", err.code, err.type);
    return Response.json({ ok: false, error: err.type ?? "appwrite_error" }, { status: 502 });
  }
}
