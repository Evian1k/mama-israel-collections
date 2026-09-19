import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signAdminToken } from "../../lib/jwt";
import { ApiError } from "../../lib/errors";
import { env } from "../../config/env";
import type { AdminSession } from "../../shared/api-types";
import type { AdminUser as DbAdminUser } from "@prisma/client";

/**
 * Admin authentication service.
 * Passwords are bcrypt-hashed; login responses expose only id/name/email/role.
 * A constant-time-ish check (dummy hash comparison) avoids leaking whether an
 * email exists when the account is missing.
 */

const DUMMY_HASH = "$2a$10$C6UzMDM.H6dfI/f/IKcEeO7ZDQKImO7aSb7Tu3O0XWp.uWrUenOFu";

function toSession(user: DbAdminUser, token: string): AdminSession {
  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: "admin" },
    mustChangePassword: user.mustChangePassword,
  };
}

export async function login(email: string, password: string): Promise<AdminSession> {
  const user = await prisma.adminUser.findUnique({ where: { email } });

  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await verifyPassword(password, hash);

  if (!user || !valid) {
    throw ApiError.unauthorized("Incorrect email or password.");
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signAdminToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
  return toSession(user, token);
}

export async function sessionFor(user: DbAdminUser): Promise<AdminSession> {
  const token = signAdminToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
  return toSession(user, token);
}

export function logoutMessage(): { message: string } {
  return { message: "Signed out. See you soon!" };
}

/**
 * Admin onboarding — change the bootstrap password (and optionally the email).
 * Called from POST /api/admin/account/change-password (requireAdmin).
 * Returns a FRESH AdminSession signed with the (possibly updated) email.
 */
export async function changeAdminPassword(
  adminId: string,
  input: { currentPassword: string; newPassword: string; email?: string }
): Promise<AdminSession> {
  const user = await prisma.adminUser.findUnique({ where: { id: adminId } });

  // Timing-safe-ish: always compare against a real bcrypt hash.
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await verifyPassword(input.currentPassword, hash);
  if (!user || !valid) {
    throw ApiError.unauthorized("Your current password is incorrect.");
  }

  const newEmail = input.email?.trim().toLowerCase();
  if (newEmail !== undefined && newEmail !== user.email) {
    const taken = await prisma.adminUser.findUnique({ where: { email: newEmail } });
    if (taken) {
      throw ApiError.conflict("That email is already in use.", "EMAIL_IN_USE");
    }
  }

  const updated = await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(input.newPassword),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      ...(newEmail !== undefined ? { email: newEmail } : {}),
    },
  });

  const token = signAdminToken({
    sub: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
  });
  return toSession(updated, token);
}

/**
 * Bootstrap — creates the initial admin account from ADMIN_EMAIL/ADMIN_PASSWORD
 * on first startup only. Existing accounts are never modified automatically
 * (rotate credentials through the database or a redeploy).
 */
export async function ensureAdminUser(): Promise<void> {
  if (!env.adminEmail || !env.adminPassword) {
    if (env.isProduction) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set for the first production boot.");
    }
    return;
  }

  const existing = await prisma.adminUser.findUnique({ where: { email: env.adminEmail } });
  if (existing) return;

  await prisma.adminUser.create({
    data: {
      email: env.adminEmail,
      name: env.adminName,
      passwordHash: await hashPassword(env.adminPassword),
      role: "admin",
      // The bootstrap account always starts by forcing a password change.
      mustChangePassword: true,
    },
  });
}
