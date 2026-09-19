import "server-only";

/**
 * ============================================================================
 * RUNTIME DATA MODE — in-memory dev store vs production backend.
 * ============================================================================
 * - BACKEND_API_URL set  → PRODUCTION mode: every /api/* and /uploads/* request
 *   is proxied (src/middleware.ts) to the Fastify + Prisma + PostgreSQL API.
 *   Only the AI Product Assistant route stays inside Next.js (z-ai SDK must
 *   never expose credentials elsewhere), and it fetches categories/images from
 *   the backend in this mode.
 * - BACKEND_API_URL unset → DEV mode: the Phase 1 in-memory adapter serves
 *   the API routes. Useful for offline UI work; never used for production.
 *
 * This module is server-only: the browser never needs to know the mode —
 * requests are simply routed (or not) by the middleware.
 */

const RAW_BACKEND_URL = process.env.BACKEND_API_URL?.trim() ?? "";

export function isBackendMode(): boolean {
  return RAW_BACKEND_URL !== "";
}

/** Backend origin without trailing slash. Only valid in backend mode. */
export function getBackendUrl(): string {
  return RAW_BACKEND_URL.replace(/\/+$/, "");
}
