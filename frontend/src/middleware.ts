import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Paths that must NEVER trigger auth redirects (for crawlers and static assets).
 * If you add middleware that redirects unauthenticated users, skip redirect for these.
 */
export const SEO_ALLOWLIST_PATHS = [
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/manifest.json",
  "/site.webmanifest",
  "/og.png",
  "/apple-touch-icon.png",
  "/image/logo.png",
  "/image/logo.svg",
];

export function isAllowlisted(pathname: string): boolean {
  if (pathname === "/" || pathname === "/terms" || pathname === "/privacy") return true;
  if (SEO_ALLOWLIST_PATHS.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (pathname.startsWith("/_next/") || pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/sitemap-") && pathname.endsWith(".xml")) return true;
  return false;
}

export default function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();

  // Block indexing of Render preview/staging subdomain
  if (host.endsWith(".onrender.com")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  // Optional: if you later add auth redirect here, bypass for allowlisted paths:
  // if (!isAllowlisted(pathname) && !isAuthenticated(request)) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }

  return response;
}
