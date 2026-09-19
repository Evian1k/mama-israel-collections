import { apiRequest } from "../client";
import type { StoreSettings } from "@/types";

/** Admin store settings API — GET/PATCH /api/admin/settings (documented extension) */
export const adminSettingsApi = {
  get(token: string, signal?: AbortSignal): Promise<StoreSettings> {
    return apiRequest<StoreSettings>("/api/admin/settings", { authToken: token, signal });
  },

  update(token: string, input: Partial<StoreSettings>): Promise<StoreSettings> {
    return apiRequest<StoreSettings>("/api/admin/settings", {
      method: "PATCH",
      authToken: token,
      body: input,
    });
  },
};
