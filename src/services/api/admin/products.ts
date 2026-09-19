import { apiRequest } from "../client";
import type {
  CreateProductInput,
  Paginated,
  Product,
  ProductQuery,
  UpdateProductInput,
} from "@/types";

/** Admin products API — /api/admin/products */
export const adminProductsApi = {
  list(token: string, query: ProductQuery = {}, signal?: AbortSignal): Promise<Paginated<Product>> {
    return apiRequest<Paginated<Product>>("/api/admin/products", {
      authToken: token,
      params: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        categoryId: query.categoryId,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        sort: query.sort,
        inStock: query.inStock,
        includeInactive: query.includeInactive ?? true,
      },
      signal,
    });
  },

  get(token: string, id: string, signal?: AbortSignal): Promise<Product> {
    return apiRequest<Product>(`/api/admin/products/${encodeURIComponent(id)}`, {
      authToken: token,
      signal,
    });
  },

  create(token: string, input: CreateProductInput): Promise<Product> {
    return apiRequest<Product>("/api/admin/products", {
      method: "POST",
      authToken: token,
      body: input,
    });
  },

  update(token: string, id: string, input: UpdateProductInput): Promise<Product> {
    return apiRequest<Product>(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: "PATCH",
      authToken: token,
      body: input,
    });
  },

  remove(token: string, id: string): Promise<{ id: string }> {
    return apiRequest<{ id: string }>(`/api/admin/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
      authToken: token,
    });
  },
};
