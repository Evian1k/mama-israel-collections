import { apiRequest } from "../client";

/** One row of the owner's configuration checklist */
export interface ProductionCheckItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

/** GET /api/admin/system/production-check — the honest readiness checklist */
export interface ProductionCheckResult {
  environment: string;
  ok: boolean;
  checks: ProductionCheckItem[];
}

/** Admin system API — /api/admin/system */
export const adminSystemApi = {
  productionCheck(token: string, signal?: AbortSignal): Promise<ProductionCheckResult> {
    return apiRequest<ProductionCheckResult>("/api/admin/system/production-check", {
      authToken: token,
      signal,
    });
  },
};
