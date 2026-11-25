import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * next/link with prefetching off by default.
 *
 * Every page here reads the signed-in café's data, so Next.js treats it as part of a per-session App Shell and
 * renders the whole destination on the server for each prefetch. With prefetching on, every visible link (nav bar,
 * each bill row) cost a full server render with its database reads on every page view, which multiplied
 * Appwrite reads (billed per row returned) several times over. A click still loads the page as usual.
 * Pass `prefetch` explicitly to opt a link back in.
 */
export default function Link({ prefetch = false, ...props }: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={prefetch} {...props} />;
}
