/**
 * API transport contracts shared by every endpoint.
 * These mirror the Phase 2 backend response envelope 1:1.
 */

export interface ApiErrorPayload {
  /** Machine-readable code, e.g. "PRODUCT_NOT_FOUND", "VALIDATION_ERROR" */
  code: string;
  /** Human-readable, user-safe message */
  message: string;
  /** Optional structured details (e.g. per-field validation issues) */
  details?: unknown;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiErrorPayload };

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** Well-known error codes used by the API layer */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  INVALID_VARIANT: "INVALID_VARIANT",
  PRICE_CHANGED: "PRICE_CHANGED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
