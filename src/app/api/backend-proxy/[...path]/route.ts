import type { NextRequest } from "next/server";
import { getBackendUrl, isBackendMode } from "@/lib/runtime-mode";

/**
 * ============================================================================
 * BACKEND PROXY — /api/_backend/[...path] → Fastify production API.
 * ============================================================================
 * The only place where Next.js and the Fastify backend meet. Middleware
 * rewrites /api/* and /uploads/* here when BACKEND_API_URL is configured.
 *
 * Design notes:
 *  - Same-origin from the browser's perspective: no CORS involved, the admin
 *    Bearer token passes through untouched, cookies are not used at all.
 *  - Bodies are buffered (JSON ≤1MB, uploads ≤10×5MB) — safe and simple;
 *    the backend enforces the real limits.
 *  - Hop-by-hop headers are stripped in both directions; the response stream
 *    is passed through as-is so images stream efficiently.
 *  - Image URLs stay relative (/uploads/...) so <img> tags keep working.
 * ============================================================================
 */

export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "content-length", // recomputed by fetch
  "accept-encoding", // let undici negotiate; backend sends identity
]);

async function forward(
  request: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
): Promise<Response> {
  if (!isBackendMode()) {
    return Response.json(
      {
        success: false,
        error: {
          code: "BACKEND_NOT_CONFIGURED",
          message:
            "The production backend is not configured for this environment. Set BACKEND_API_URL.",
        },
      },
      { status: 503 }
    );
  }

  const { path } = await ctx.params;
  const target = `${getBackendUrl()}/${(path ?? []).join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  }

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.arrayBuffer();
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json(
      {
        success: false,
        error: {
          code: "BACKEND_UNREACHABLE",
          message: "We could not reach the store services. Please try again shortly.",
        },
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  for (const [key, value] of backendResponse.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "content-encoding") continue;
    responseHeaders.set(key, value);
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
