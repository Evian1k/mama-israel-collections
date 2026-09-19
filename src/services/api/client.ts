import type { ApiResponse } from "@/types/api";

/**
 * ============================================================================
 * API HTTP CLIENT — the single gateway for every network request in the app.
 * ============================================================================
 * - UI components NEVER call fetch directly; they go through the service
 *   modules in `src/services/api/*`, which use this client.
 * - In Phase 1 requests go to the Next.js route handlers (dev adapter).
 * - In Phase 2 set NEXT_PUBLIC_API_URL to the Render backend URL and nothing
 *   else changes.
 * ============================================================================
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the request failed because there is no session (401) */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True for network-level failures (server unreachable / offline) */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: "The request was invalid. Please check your input and try again.",
  401: "Please sign in to continue.",
  403: "You do not have permission to perform this action.",
  404: "We could not find what you were looking for.",
  409: "This action conflicts with the current state. Please refresh and try again.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "The server is unreachable right now. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
};

const FALLBACK_ERROR_MESSAGE =
  "Something went wrong while processing your request. Please try again or contact us on WhatsApp.";

/**
 * Technical errors (stack traces, Prisma/SQL internals, server jargon) must
 * never reach customers. When a server message looks technical, substitute
 * the friendly default text for that status. Genuine, human-written server
 * messages pass through untouched.
 */
const TECHNICAL_MESSAGE_PATTERN = /prisma|postgres|sql|syntax|stack|internal/i;

function sanitizeErrorMessage(message: string, status: number): string {
  if (!TECHNICAL_MESSAGE_PATTERN.test(message)) return message;
  if (status === 500) return FALLBACK_ERROR_MESSAGE;
  return DEFAULT_ERROR_MESSAGES[status] ?? FALLBACK_ERROR_MESSAGE;
}

export type QueryPrimitive = string | number | boolean | null | undefined;
export type QueryValue = QueryPrimitive | QueryPrimitive[] | Array<string | number>;

export function buildQueryString(params: Record<string, QueryValue> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) {
      const list = value.filter((v) => v !== null && v !== undefined && v !== "");
      if (list.length > 0) search.set(key, list.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Resolve the API base URL.
 * - NEXT_PUBLIC_API_URL (Phase 2 backend) when provided.
 * - Browser: same origin.
 * - Server components: reconstruct origin from request headers.
 */
export async function getApiBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && configured.trim() !== "") {
    return configured.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side (server components / metadata generation)
  const { headers } = await import("next/headers");
  const h = await headers();
  const host =
    h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  params?: Record<string, QueryValue>;
  /** Admin bearer token (dev adapter session token in Phase 1) */
  authToken?: string | null;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const base = await getApiBaseUrl();
  const { method = "GET", body, params, authToken, signal } = options;

  const url = `${base}${path}${buildQueryString(params)}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      "We could not reach the store. Please check your connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    if (payload && payload.success === false) {
      throw new ApiError(
        sanitizeErrorMessage(
          payload.error.message || DEFAULT_ERROR_MESSAGES[response.status] || "Request failed.",
          response.status
        ),
        response.status,
        payload.error.code,
        payload.error.details
      );
    }
    throw new ApiError(
      DEFAULT_ERROR_MESSAGES[response.status] ?? "Request failed.",
      response.status,
      response.status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR"
    );
  }

  return payload.data;
}
