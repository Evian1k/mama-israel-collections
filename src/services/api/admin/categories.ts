import { apiRequest } from "../client";
import type { Category, CreateCategoryInput, UpdateCategoryInput } from "@/types";

/** Admin categories API — /api/admin/categories */
export const adminCategoriesApi = {
  list(token: string, signal?: AbortSignal): Promise<Category[]> {
    return apiRequest<Category[]>("/api/admin/categories", { authToken: token, signal });
  },

  create(token: string, input: CreateCategoryInput): Promise<Category> {
    return apiRequest<Category>("/api/admin/categories", {
      method: "POST",
      authToken: token,
      body: input,
    });
  },

  update(token: string, id: string, input: UpdateCategoryInput): Promise<Category> {
    return apiRequest<Category>(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "PATCH",
      authToken: token,
      body: input,
    });
  },

  remove(token: string, id: string): Promise<{ id: string }> {
    return apiRequest<{ id: string }>(`/api/admin/categories/${encodeURIComponent(id)}`, {
      method: "DELETE",
      authToken: token,
    });
  },
};
