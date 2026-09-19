import { randomUUID } from "crypto";
import { ApiError } from "@/services/api/client";
import type { AdminSession, AdminUser } from "@/types";

/**
 * ============================================================================
 * ADMIN AUTHENTICATION — DEVELOPMENT ADAPTER (offline dev only)
 * ============================================================================
 * Validates the owner's login against environment variables and issues an
 * opaque in-memory session token. Every /api/admin/* route requires it.
 *
 * !! This is scaffolding, NOT production security. When BACKEND_API_URL is
 * set the real Fastify + JWT backend serves every /api/* request and this
 * adapter is never reached. It exists only so the UI runs end-to-end with
 * the backend disconnected. The response shapes mirror the backend contract
 * (including mustChangePassword and the change-credentials endpoint).
 * No default credentials are shipped — set ADMIN_EMAIL / ADMIN_PASSWORD to
 * use the offline dev adapter.
 * ============================================================================
 */

// No shipped defaults — credentials must come from ADMIN_EMAIL / ADMIN_PASSWORD.
// When unset (offline dev only) the email falls back to a neutral placeholder and
// the password is RANDOMISED per boot so no reusable default ever exists.
const DEV_EMAIL = (process.env.ADMIN_EMAIL ?? "owner@dev.local").toLowerCase();
const DEV_PASSWORD = process.env.ADMIN_PASSWORD ?? randomUUID();

/**
 * Sessions live on globalThis so they survive dev-server HMR reloads
 * (module re-evaluation would otherwise sign the owner out constantly).
 * The dev password lives there too so a credential change survives HMR.
 */
const globalAuth = globalThis as unknown as {
  __micAdminSessions?: Map<string, AdminUser>;
  __micAdminPassword?: string;
};
const sessions = (globalAuth.__micAdminSessions ??= new Map<string, AdminUser>());
const activePassword = (globalAuth.__micAdminPassword ??= DEV_PASSWORD);

const ADMIN_USER: AdminUser = {
  id: "admin_owner",
  name: "Store Owner",
  email: DEV_EMAIL,
  role: "admin",
};

function sessionFor(token: string, user: AdminUser): AdminSession {
  // The dev adapter bootstraps with known-good credentials, so the forced
  // password change never applies here.
  return { token, user, mustChangePassword: false };
}

export function adminLogin(email: string, password: string): AdminSession {
  if (email.trim().toLowerCase() !== ADMIN_USER.email || password !== activePassword) {
    throw new ApiError("Incorrect email or password.", 401, "UNAUTHORIZED");
  }
  const token = `dev_${randomUUID()}`;
  sessions.set(token, ADMIN_USER);
  return sessionFor(token, ADMIN_USER);
}

export function requireAdmin(request: Request): AdminUser {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const user = token ? sessions.get(token) : undefined;
  if (!user) {
    throw new ApiError("Please sign in to the admin panel.", 401, "UNAUTHORIZED");
  }
  return user;
}

export function adminSessionInfo(token: string): AdminSession | null {
  const user = sessions.get(token);
  return user ? sessionFor(token, user) : null;
}

export function adminLogout(token: string): void {
  sessions.delete(token);
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

/**
 * POST /api/admin/account/change-password (dev adapter).
 * Verifies the current password, rotates the stored password (and optionally
 * the admin email) and returns a FRESH session — mirroring the backend
 * contract, including the friendly error messages.
 */
export function adminChangeCredentials(
  token: string,
  input: { currentPassword: string; newPassword: string; email?: string }
): AdminSession {
  const user = requireAdmin(
    new Request("http://local/dev", { headers: { authorization: `Bearer ${token}` } })
  );

  if (input.currentPassword !== activePassword) {
    throw new ApiError("The current password is incorrect.", 401, "UNAUTHORIZED");
  }
  if (!PASSWORD_RULE.test(input.newPassword)) {
    throw new ApiError(
      "Choose a password of at least 10 characters including letters and numbers.",
      400,
      "WEAK_PASSWORD"
    );
  }
  const nextEmail = input.email?.trim().toLowerCase();
  if (nextEmail && nextEmail !== user.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      throw new ApiError("Enter a valid email address.", 400, "VALIDATION_ERROR");
    }
    // Single-admin dev adapter: the only email that can be taken is the
    // current one, which was excluded above.
  }

  globalAuth.__micAdminPassword = input.newPassword;
  const updatedUser: AdminUser = { ...user, email: nextEmail || user.email };
  ADMIN_USER.email = updatedUser.email;
  sessions.delete(token);

  const freshToken = `dev_${randomUUID()}`;
  sessions.set(freshToken, updatedUser);
  return sessionFor(freshToken, updatedUser);
}
