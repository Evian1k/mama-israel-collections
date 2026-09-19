import { apiRequest } from "../client";
import type { CustomerDetail, CustomerSummary } from "@/types";

/** Admin customers API — GET /api/admin/customers (aggregated from orders) */
export const adminCustomersApi = {
  list(token: string, signal?: AbortSignal): Promise<CustomerSummary[]> {
    return apiRequest<CustomerSummary[]>("/api/admin/customers", { authToken: token, signal });
  },

  get(token: string, id: string, signal?: AbortSignal): Promise<CustomerDetail> {
    return apiRequest<CustomerDetail>(`/api/admin/customers/${encodeURIComponent(id)}`, {
      authToken: token,
      signal,
    });
  },
};
