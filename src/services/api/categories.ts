import { apiRequest } from "./client";
import type { Category } from "@/types";

/** Categories API — GET /api/categories */
export const categoriesApi = {
  list(
    opts: { includeInactive?: boolean } = {},
    signal?: AbortSignal
  ): Promise<Category[]> {
    return apiRequest<Category[]>("/api/categories", {
      params: { includeInactive: opts.includeInactive || undefined },
      signal,
    });
  },
};
