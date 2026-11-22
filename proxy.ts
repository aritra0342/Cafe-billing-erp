import { clerkMiddleware } from "@clerk/nextjs/server";

// Session handling only. Access control is resource-based (Clerk's recommended pattern):
// every data read and server action calls requireUser() in lib/auth.ts, which redirects
// signed-out visitors to /sign-in, so nothing depends on path matching here.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
