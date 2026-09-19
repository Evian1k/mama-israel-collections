import type { FastifyReply, FastifyRequest } from "fastify";
import { ApiError } from "./errors";
import type { ApiResponse } from "../shared/api-types";
import { env } from "../config/env";

/**
 * ============================================================================
 * HTTP HELPERS — the shared ApiResponse envelope + central error handling.
 * ============================================================================
 */

export function ok<T>(reply: FastifyReply, data: T, status = 200): FastifyReply {
  return reply.code(status).send({ success: true, data } satisfies ApiResponse<T>);
}

export function fail(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
  details?: unknown
): FastifyReply {
  return reply.code(status).send({ success: false, error: { code, message, details } });
}

interface ErrorBody {
  err?: unknown;
}

/** Central error handler — registered once in app.ts */
export function handleError(error: ErrorBody & Error, request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      request.log.error({ err: error, reqId: request.id }, "API error");
    }
    fail(reply, error.statusCode, error.code, error.message, error.details);
    return;
  }

  const anyError = error as (Error & { statusCode?: number; code?: string }) | null;

  // Body parsing failures → 400 BAD_REQUEST
  if (anyError && typeof anyError.statusCode === "number") {
    const status = anyError.statusCode;
    if (status >= 400 && status < 500) {
      const isJson = anyError.code === "FST_ERR_CTP_INVALID_JSON" || /json/i.test(anyError.message);
      fail(
        reply,
        status,
        isJson ? "BAD_REQUEST" : "BAD_REQUEST",
        isJson ? "Request body must be valid JSON." : anyError.message
      );
      return;
    }
  }

  request.log.error({ err: error, reqId: request.id }, "Unhandled error");
  fail(
    reply,
    500,
    "INTERNAL_ERROR",
    env.isProduction
      ? "Something went wrong on our side. Please try again."
      : `Something went wrong: ${error?.message ?? "unknown error"}`
  );
}

export function handleNotFound(request: FastifyRequest, reply: FastifyReply): void {
  fail(
    reply,
    404,
    "NOT_FOUND",
    `Route ${request.method} ${request.url} was not found.`
  );
}

/** Extract and validate page/limit query params */
export function readPagination(query: Record<string, unknown>, defaultLimit = 12, maxLimit = 48) {
  const page = Math.max(1, Number.parseInt(String(query.page ?? "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(String(query.limit ?? defaultLimit), 10) || defaultLimit));
  return { page, limit };
}

export function readBoolean(query: Record<string, unknown>, key: string): boolean | undefined {
  const raw = query[key];
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  return undefined;
}

export function readNumber(query: Record<string, unknown>, key: string): number | undefined {
  const raw = query[key];
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function readStringList(query: Record<string, unknown>, key: string): string[] | undefined {
  const raw = query[key];
  if (raw === undefined || raw === null || raw === "") return undefined;
  const list = String(raw)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 40);
  return list.length > 0 ? list : undefined;
}

export { ApiError };
