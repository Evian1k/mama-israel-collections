import { buildApp } from "./app";
import { assertProductionConfig, env } from "./config/env";
import { prisma } from "./lib/prisma";
import { ensureAdminUser } from "./modules/auth/auth.service";
import { getSettings } from "./modules/store/store.service";
import { initStorage } from "./modules/uploads/storage.service";
import fs from "fs";

/**
 * ============================================================================
 * SERVER ENTRYPOINT
 * ============================================================================
 * - Listens on 0.0.0.0:$PORT (Render-compatible; never hardcodes localhost).
 * - Bootstraps: admin account (first boot only), store settings row, storage.
 * - Graceful shutdown on SIGTERM/SIGINT (Render sends SIGTERM on deploys).
 * ============================================================================
 */

async function main(): Promise<void> {
  assertProductionConfig();
  initStorage();

  const app = await buildApp();

  // Bootstrap database-backed basics (idempotent)
  try {
    await prisma.$queryRaw`SELECT 1`;
    await ensureAdminUser();
    await getSettings(); // creates the settings row on first boot
    if (!fs.existsSync(env.uploadsDir)) {
      fs.mkdirSync(env.uploadsDir, { recursive: true });
    }
  } catch (error) {
    app.log.error({ err: error }, "Database bootstrap failed");
    process.exit(1);
  }

  await app.listen({ port: env.port, host: env.host });

  const stop = async (signal: string) => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", error);
  process.exit(1);
});
