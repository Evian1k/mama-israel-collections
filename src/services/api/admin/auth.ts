import { apiRequest } from "../client";
import type { AdminSession } from "@/types";

/**
 * Admin authentication (dev adapter for Phase 1).
 *
 * Phase 1: POST /api/admin/auth/login validates against ADMIN_EMAIL /
 * ADMIN_PASSWORD env vars and returns an opaque session token held in
 * localStorage. All /api/admin/* routes require `Authorization: Bearer <token>`.
 *
 * Phase 2: replaced by real JWT/session auth on the backend (see
 * docs/BACKEND_IMPLEMENTATION_PLAN.md — Authentication & Admin authorization).
 * The frontend contract below does not change.
 */
export const adminAuthApi = {
  login(email: string, password: string): Promise<AdminSession> {
    return apiRequest<AdminSession>("/api/admin/auth/login", {
      method: "POST",
      body: { email: email.trim().toLowerCase(), password },
    });
  },

  /** Validates a stored token; throws ApiError(401) when invalid/expired */
  session(token: string, signal?: AbortSignal): Promise<AdminSession> {
    return apiRequest<AdminSession>("/api/admin/auth/session", { authToken: token, signal });
  },

  logout(token: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("/api/admin/auth/logout", {
      method: "POST",
      authToken: token,
    });
  },

  /**
   * POST /api/admin/account/change-password — rotate the admin password
   * (and optionally the admin email). Returns a FRESH session (new token)
   * with mustChangePassword cleared. Errors:
   * 401 wrong current password, 400 weak password, 409 email already taken.
   */
  changeCredentials(
    token: string,
    input: { currentPassword: string; newPassword: string; email?: string }
  ): Promise<AdminSession> {
    return apiRequest<AdminSession>("/api/admin/account/change-password", {
      method: "POST",
      authToken: token,
      body: input,
    });
  },
};
