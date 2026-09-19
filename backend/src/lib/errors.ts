/**
 * ============================================================================
 * API ERRORS — mirror of the frontend contract (src/services/api/client.ts)
 * ============================================================================
 * Every failure becomes:
 *   { "success": false, "error": { "code", "message", "details"? } }
 * Codes match API_ERROR_CODES in src/types/api.ts plus a few server-side ones.
 * Stack traces are never exposed to clients.
 * ============================================================================
 */

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, code = "INTERNAL_ERROR", details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError(message, 400, "VALIDATION_ERROR", details);
  }
  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, 400, "BAD_REQUEST", details);
  }
  static unauthorized(message = "Please sign in to continue."): ApiError {
    return new ApiError(message, 401, "UNAUTHORIZED");
  }
  static forbidden(message = "You do not have permission to perform this action."): ApiError {
    return new ApiError(message, 403, "FORBIDDEN");
  }
  static notFound(message = "We could not find what you were looking for.", code = "NOT_FOUND"): ApiError {
    return new ApiError(message, 404, code);
  }
  static conflict(message: string, code = "CONFLICT"): ApiError {
    return new ApiError(message, 409, code);
  }
  static rateLimited(message = "Too many requests. Please wait a moment and try again."): ApiError {
    return new ApiError(message, 429, "RATE_LIMITED");
  }
  static unavailable(message: string, code: string): ApiError {
    return new ApiError(message, 503, code);
  }
  static internal(message = "Something went wrong on our side. Please try again."): ApiError {
    return new ApiError(message, 500, "INTERNAL_ERROR");
  }
}
