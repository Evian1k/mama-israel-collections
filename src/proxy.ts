import { NextResponse, type NextRequest } from "next/server";

/**
 * ============================================================================
 * DATA-PLANE ROUTER — production backend vs in-memory dev store.
 * ============================================================================
 * When BACKEND_API_URL is configured (production), every API request and every
 * uploaded product image is transparently rewritten to the Fastify +
 * PostgreSQL backend via the /api/backend-proxy route. The browser only ever
 * talks to this origin — no CORS, no cross-origin cookies, one exposed port.
 *
 * When BACKEND_API_URL is unset, requests fall through to the built-in
 * in-memory dev adapter (offline UI development only).
 *
 * EXCLUSIONS (stay inside Next.js even in production mode):
 *   - /api/backend-proxy/**   the proxy itself (prevents rewrite loops)
 *   - /api/admin/ai-assistant   the AI engine uses the z-ai SDK server-side
 *
 * In a classic multi-origin deployment (e.g. api.shop.com on another host)
 * this file is simply not needed: set NEXT_PUBLIC_API_URL instead and the API
 * client talks to the backend directly.
 * ============================================================================
 */

const BACKEND_URL = process.env.BACKEND_API_URL?.trim() ?? "";
const PROXY_ROOT = "/api/backend-proxy";

export function proxy(request: NextRequest) {
  if (BACKEND_URL === "") return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Never touch the proxy itself or the AI assistant route.
  if (pathname === PROXY_ROOT || pathname.startsWith(`${PROXY_ROOT}/`)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/admin/ai-assistant")) {
    return NextResponse.next();
  }

  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const isUpload = pathname.startsWith("/uploads/");

  if (!isApi && !isUpload) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `${PROXY_ROOT}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/api/:path*", "/uploads/:path*"],
};
