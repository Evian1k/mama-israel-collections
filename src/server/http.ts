import { NextResponse } from "next/server";
import { ApiError } from "@/services/api/client";
import type { ApiResponse } from "@/types/api";

/**
 * Response helpers for the dev-adapter route handlers.
 * Every endpoint answers with the shared ApiResponse envelope.
 */

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown
): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error: { code, message, details } }, { status });
}

/** Convert any thrown error into a consistent API error response */
export function toErrorResponse(error: unknown): NextResponse<ApiResponse<never>> {
  if (error instanceof ApiError) {
    return fail(error.status, error.code, error.message, error.details);
  }
  console.error("[api] Unhandled error:", error);
  return fail(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/**
 * Read and parse a JSON body defensively.
 * Throws ApiError(400) on malformed JSON so handlers stay clean.
 */
export async function readJsonBody<T = unknown>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError("Request body must be valid JSON.", 400, "BAD_REQUEST");
  }
}
