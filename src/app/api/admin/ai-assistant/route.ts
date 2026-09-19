import { requireAdmin } from "@/server/admin-auth";
import { aiAssistantRequestSchema, parseProductDescription } from "@/server/ai-assistant";
import { ok, readJsonBody, toErrorResponse } from "@/server/http";
import { parseOrThrow } from "@/server/validation";
import { ApiError } from "@/services/api/client";
import { getBackendUrl, isBackendMode } from "@/lib/runtime-mode";

/**
 * POST /api/admin/ai-assistant — AI Product Assistant (admin only).
 *
 * Takes the owner's natural-language description (and optional already-uploaded
 * photo URLs) and returns product DRAFTS for review. Nothing is saved to the
 * product database here — publishing goes through the normal
 * POST /api/admin/products endpoint, so every field is validated by the same
 * schema the manual product form uses.
 *
 * Security: requires an admin session; the z-ai-web-dev-sdk runs server-side
 * only and its credentials never reach the browser.
 *
 * Auth by runtime mode:
 *  - Backend mode: the browser holds a production JWT — validate it against
 *    the backend session endpoint (the account is checked in PostgreSQL).
 *  - Dev mode: validate against the in-memory dev session store.
 */
async function assertAdmin(request: Request): Promise<void> {
  if (!isBackendMode()) {
    requireAdmin(request);
    return;
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    throw new ApiError("Please sign in to the admin panel.", 401, "UNAUTHORIZED");
  }

  let response: Response;
  try {
    response = await fetch(`${getBackendUrl()}/api/admin/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new ApiError(
      "We could not verify your sign-in. Please try again in a moment.",
      502,
      "AUTH_CHECK_FAILED"
    );
  }
  if (!response.ok) {
    throw new ApiError("Please sign in to the admin panel.", 401, "UNAUTHORIZED");
  }
}

export async function POST(request: Request) {
  try {
    await assertAdmin(request);

    const body = await readJsonBody(request);
    const { text, imageUrls } = parseOrThrow(aiAssistantRequestSchema, body);

    // Only allow photos that were uploaded through the admin uploads API:
    // backend-storage paths (/uploads/...) or object-storage URLs (https).
    const safeImageUrls = (imageUrls ?? []).filter(
      (url) => url.startsWith("/uploads/") || (isBackendMode() && /^https:\/\//i.test(url))
    );

    const result = await parseProductDescription(text, safeImageUrls);
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
