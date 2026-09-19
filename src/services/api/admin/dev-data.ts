import { apiRequest } from "../client";

/**
 * DEVELOPMENT-ONLY dev-data controls (never available in Phase 2).
 *
 * Lets the owner preview every UI state with clearly-labelled sample fixtures:
 * - POST /api/admin/dev-data { action: "seed-sample" }
 * - POST /api/admin/dev-data { action: "clear-sample" }
 * - POST /api/admin/dev-data { action: "reset" }
 *
 * Sample data is always visibly prefixed with "Sample:" and can be wiped with
 * one click. Nothing is auto-loaded — the production app starts empty.
 */
export const adminDevDataApi = {
  seedSample(token: string): Promise<{ message: string; counts: Record<string, number> }> {
    return apiRequest("/api/admin/dev-data", {
      method: "POST",
      authToken: token,
      body: { action: "seed-sample" },
    });
  },

  clearSample(token: string): Promise<{ message: string }> {
    return apiRequest("/api/admin/dev-data", {
      method: "POST",
      authToken: token,
      body: { action: "clear-sample" },
    });
  },

  resetAll(token: string): Promise<{ message: string }> {
    return apiRequest("/api/admin/dev-data", {
      method: "POST",
      authToken: token,
      body: { action: "reset" },
    });
  },
};
