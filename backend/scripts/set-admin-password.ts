/* eslint-disable no-console */
import path from "path";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// Same PostgreSQL-only guard as the API: ignore inherited file: DATABASE_URLs
const fileEnv = dotenv.config({ path: path.resolve(__dirname, "..", ".env"), quiet: true }).parsed ?? {};
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  if (fileEnv.DATABASE_URL) process.env.DATABASE_URL = fileEnv.DATABASE_URL;
}

/**
 * ============================================================================
 * OPS UTILITY — rotate an admin account's password.
 * ============================================================================
 * Usage:
 *   bun run scripts/set-admin-password.ts <email> <new-password>
 *
 * The first-boot bootstrap (ensureAdminUser) never modifies existing accounts,
 * so this script is the supported way to rotate credentials in place — locally
 * or on a deployed database. The password is bcrypt-hashed (same policy as the
 * API) and never logged.
 * ============================================================================
 */

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [email, password] = process.argv.slice(2);

  if (!email || !password) {
    console.error("Usage: bun run scripts/set-admin-password.ts <email> <new-password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Refusing to set a password shorter than 8 characters.");
    process.exit(1);
  }

  const normalisedEmail = email.trim().toLowerCase();
  const user = await prisma.adminUser.findUnique({ where: { email: normalisedEmail } });

  if (!user) {
    console.error(`No admin account found for ${normalisedEmail}.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  console.log(`Password updated for ${normalisedEmail} (id: ${user.id}).`);
}

main()
  .catch((error) => {
    console.error("Failed to update password:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
