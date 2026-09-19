import path from "path";
import dotenv from "dotenv";

/**
 * ============================================================================
 * ENVIRONMENT CONFIGURATION
 * ============================================================================
 * - Loads backend/.env (this folder) — the backend is a standalone project.
 * - SECURITY RULE: this process must NEVER trust a `file:` DATABASE_URL.
 *   Some hosts/sandboxes export a global DATABASE_URL pointing at SQLite for
 *   other tools; that is always invalid here (PostgreSQL-only API), so in that
 *   specific case we fall back to the value from backend/.env.
 * - On Render the real env vars come from the dashboard; backend/.env does not
 *   exist there, so dashboard values simply win.
 * ============================================================================
 */

const envFilePath = path.resolve(__dirname, "..", "..", ".env");
const fileEnv = dotenv.config({ path: envFilePath, quiet: true }).parsed ?? {};

function read(key: string): string {
  const fromProcess = process.env[key];
  if (fromProcess !== undefined && fromProcess !== "") {
    // Guard against inherited SQLite URLs (this API is PostgreSQL-only).
    if (key === "DATABASE_URL" && fromProcess.startsWith("file:")) {
      return fileEnv[key] ?? "";
    }
    return fromProcess;
  }
  return fileEnv[key] ?? "";
}

function intRead(key: string, fallback: number): number {
  const raw = read(key);
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function listRead(key: string): string[] {
  return read(key)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

const nodeEnv = read("NODE_ENV") || "development";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  isDevelopment: nodeEnv !== "production",

  port: intRead("PORT", 3900),
  host: "0.0.0.0",

  databaseUrl: read("DATABASE_URL"),

  jwtSecret: read("JWT_SECRET"),
  jwtExpiresIn: read("JWT_EXPIRES_IN") || "7d",

  /** Allowed browser origins (comma-separated). No wildcard in production. */
  frontendOrigins: listRead("FRONTEND_URL"),

  adminEmail: read("ADMIN_EMAIL").trim().toLowerCase(),
  adminPassword: read("ADMIN_PASSWORD"),
  adminName: read("ADMIN_NAME") || "Store Owner",

  cloudinary: {
    cloudName: read("CLOUDINARY_CLOUD_NAME"),
    apiKey: read("CLOUDINARY_API_KEY"),
    apiSecret: read("CLOUDINARY_API_SECRET"),
    get configured(): boolean {
      return Boolean(
        read("CLOUDINARY_CLOUD_NAME") && read("CLOUDINARY_API_KEY") && read("CLOUDINARY_API_SECRET")
      );
    },
  },

  mpesa: {
    /** "simulator" is a dev-only test mode (no Daraja calls) — refuses production. */
    mode: read("MPESA_MODE") || "live",
    environment: read("MPESA_ENV") || "sandbox",
    consumerKey: read("MPESA_CONSUMER_KEY"),
    consumerSecret: read("MPESA_CONSUMER_SECRET"),
    shortcode: read("MPESA_SHORTCODE"),
    passkey: read("MPESA_PASSKEY"),
    callbackUrl: read("MPESA_CALLBACK_URL"),
    get configured(): boolean {
      return Boolean(
        read("MPESA_CONSUMER_KEY") &&
          read("MPESA_CONSUMER_SECRET") &&
          read("MPESA_SHORTCODE") &&
          read("MPESA_PASSKEY")
      );
    },
  },

  /** Transactional email via Resend. Empty key = attempts are logged, not sent. */
  email: {
    resendApiKey: read("RESEND_API_KEY"),
    from: read("EMAIL_FROM") || "Mama Israel Collections <onboarding@resend.dev>",
    adminInbox: read("EMAIL_ADMIN_INBOX"),
  },

  /** Directory used by the dev-only local upload fallback. */
  uploadsDir: path.resolve(__dirname, "..", "..", "uploads"),
} as const;

/** Fail fast when production would run insecurely. */
export function assertProductionConfig(): void {
  if (!env.isProduction) return;
  const problems: string[] = [];
  if (!env.databaseUrl || env.databaseUrl.startsWith("file:")) {
    problems.push("DATABASE_URL must point to a PostgreSQL instance");
  }
  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    problems.push("JWT_SECRET must be set to at least 32 characters");
  }
  if (env.frontendOrigins.length === 0) {
    problems.push("FRONTEND_URL must list the allowed frontend origin(s)");
  }
  if (env.adminEmail && env.adminPassword && env.adminPassword.length < 8) {
    problems.push("ADMIN_PASSWORD must be at least 8 characters");
  }
  if (env.mpesa.mode === "simulator") {
    problems.push("MPESA_MODE=simulator is not allowed in production");
  }
  if (problems.length > 0) {
    throw new Error(
      `Refusing to start in production with an unsafe configuration:\n- ${problems.join("\n- ")}`
    );
  }
}
