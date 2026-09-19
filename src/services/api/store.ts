import { apiRequest } from "./client";
import type { StoreSettings } from "@/types";

/** Store settings API — GET /api/store */
export const storeApi = {
  getSettings(signal?: AbortSignal): Promise<StoreSettings> {
    return apiRequest<StoreSettings>("/api/store", { signal });
  },
};
