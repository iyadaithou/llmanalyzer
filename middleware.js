import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

/**
 * Password-gate middleware.
 * Everything except the public list redirects to /login when the
 * llma_auth cookie is missing or invalid.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/api/auth",
  "/api/health",
];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Landing page is public too
  if (pathname === "/") return NextResponse.next();

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await verifyToken(token)) return NextResponse.next();

  // API calls get a 401, page navigations get redirected to /login
  if (pathname.startsWith("/api/")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
