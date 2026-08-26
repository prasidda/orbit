import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed Middleware to Proxy — same runtime, new filename. Clerk
 * still ships the function as `clerkMiddleware`; only the file changed.
 *
 * This is an optimistic gate: it keeps signed-out visitors out of the app
 * shell, but it is NOT the authorization boundary. That lives in Convex
 * (`requireUser` / `assertCanView`), which every query re-checks server-side.
 */
const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/(.*)"]);

const withClerk = clerkMiddleware(async (auth, request) => {
  if (isPublic(request)) return NextResponse.next();
  await auth.protect();
  return NextResponse.next();
});

export default function proxy(request: NextRequest, event: Parameters<typeof withClerk>[1]) {
  // A fresh clone has no keys yet. Let it through so the setup screen can
  // render instead of every route 500ing on a missing publishable key.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    // Everything except static assets and Next internals.
    "/((?!_next|favicon.ico|manifest.webmanifest|icons|.*\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
