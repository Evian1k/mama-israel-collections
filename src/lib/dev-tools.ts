/**
 * DEVELOPMENT-ONLY dev-data tools (seed/reset in-memory fixtures).
 *
 * Phase 2: the production backend + PostgreSQL is the single source of truth,
 * so these controls are DISABLED by default. To re-enable them while working
 * against the Phase 1 dev adapter, set:
 *
 *   NEXT_PUBLIC_ENABLE_DEV_TOOLS=true
 *
 * and make sure no backend proxy is active (unset BACKEND_PROXY_URL).
 * Real sample data for the production backend is seeded explicitly via
 * `bun run db:seed` inside backend/ — never through the UI.
 */
export const devToolsEnabled: boolean =
  process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";
