import { apiRequest } from "./client";
import type { Paginated, Product, ProductQuery, ProductSort } from "@/types";

/**
 * Products API — storefront surface.
 * Mirrors: GET /api/products, /api/products/featured, /api/products/new-arrivals,
 * /api/products/search, /api/products/:slug
 */
export const productsApi = {
  list(query: ProductQuery = {}, signal?: AbortSignal): Promise<Paginated<Product>> {
    return apiRequest<Paginated<Product>>("/api/products", {
      params: {
        page: query.page,
        limit: query.limit,
        search: query.search,
        categoryId: query.categoryId,
        categorySlug: query.categorySlug,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
        sizes: query.sizes,
        colors: query.colors,
        sort: query.sort,
        featured: query.featured,
        newArrival: query.newArrival,
        inStock: query.inStock,
      },
      signal,
    });
  },

  featured(limit?: number, signal?: AbortSignal): Promise<Product[]> {
    return apiRequest<Product[]>("/api/products/featured", { params: { limit }, signal });
  },

  newArrivals(limit?: number, signal?: AbortSignal): Promise<Product[]> {
    return apiRequest<Product[]>("/api/products/new-arrivals", { params: { limit }, signal });
  },

  search(term: string, limit?: number, signal?: AbortSignal): Promise<Product[]> {
    return apiRequest<Product[]>("/api/products/search", {
      params: { q: term, limit },
      signal,
    });
  },

  /** Accepts a product slug (preferred) or id */
  bySlug(slug: string, signal?: AbortSignal): Promise<Product> {
    return apiRequest<Product>(`/api/products/${encodeURIComponent(slug)}`, { signal });
  },
};

export type { ProductSort };
