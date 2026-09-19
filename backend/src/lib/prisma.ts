import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

/**
 * Prisma client — the only database access layer in the backend.
 * A single instance is reused across the process (HMR-safe in dev via globalThis).
 *
 * SECURITY/ROBUSTNESS GUARD (must run before the client is constructed):
 * This API is PostgreSQL-only. Some hosts/sandboxes export a global
 * `DATABASE_URL=file:...` (SQLite) for other tools — that value is always
 * invalid here, so we replace it with the backend/.env value. On Render the
 * dashboard-provided DATABASE_URL wins because no .env file exists there.
 */
const fileEnv =
  dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env"), quiet: true }).parsed ?? {};

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
  if (fileEnv.DATABASE_URL) {
    process.env.DATABASE_URL = fileEnv.DATABASE_URL;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ["error"] : ["error", "warn"],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
