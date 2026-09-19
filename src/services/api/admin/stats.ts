import { apiRequest } from "../client";
import type { AnalyticsData, DashboardStats } from "@/types";

/**
 * Admin stats API (documented extension):
 * - GET /api/admin/stats      → dashboard cards + recent activity
 * - GET /api/admin/analytics  → trends for the Analytics page
 * All numbers are computed server-side from real data (zeros when empty).
 */
export const adminStatsApi = {
  dashboard(token: string, signal?: AbortSignal): Promise<DashboardStats> {
    return apiRequest<DashboardStats>("/api/admin/stats", { authToken: token, signal });
  },

  analytics(token: string, signal?: AbortSignal): Promise<AnalyticsData> {
    return apiRequest<AnalyticsData>("/api/admin/analytics", { authToken: token, signal });
  },
};
