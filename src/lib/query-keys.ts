import type { ProductQuery } from "@/types/product";

/**
 * Centralised TanStack Query cache keys.
 * Keep every query key here so invalidation stays predictable.
 */
export const queryKeys = {
  storeSettings: () => ["store", "settings"] as const,

  categories: (opts?: { includeInactive?: boolean }) =>
    ["categories", opts?.includeInactive ?? false] as const,

  products: (query: ProductQuery) => ["products", "list", query] as const,
  product: (slug: string) => ["products", "detail", slug] as const,
  featuredProducts: (limit?: number) => ["products", "featured", limit ?? 8] as const,
  newArrivals: (limit?: number) => ["products", "new-arrivals", limit ?? 8] as const,

  order: (orderNumber: string) => ["orders", "public", orderNumber] as const,

  /** Public checkout payment availability — GET /api/payments/methods */
  paymentMethods: () => ["payments", "methods"] as const,

  admin: {
    session: (token: string | null) => ["admin", "session", token ? "authed" : "anon"] as const,
    /** Session refresh used by the admin shell to adopt fresh session flags */
    sessionCheck: (token: string | null) =>
      ["admin", "session-check", token ? "authed" : "anon"] as const,
    productionCheck: (token: string | null) =>
      ["admin", "production-check", token ? "authed" : "anon"] as const,
    stats: (token: string | null) => ["admin", "stats", token ? "authed" : "anon"] as const,
    analytics: (token: string | null) => ["admin", "analytics", token ? "authed" : "anon"] as const,
    products: (token: string | null, query: ProductQuery) =>
      ["admin", "products", "list", query] as const,
    product: (token: string | null, id: string) => ["admin", "products", "detail", id] as const,
    orders: (token: string | null, query: { page?: number; status?: string; search?: string }) =>
      ["admin", "orders", "list", query] as const,
    order: (token: string | null, id: string) => ["admin", "orders", "detail", id] as const,
    customers: (token: string | null) => ["admin", "customers"] as const,
    categories: (token: string | null) => ["admin", "categories"] as const,
    settings: (token: string | null) => ["admin", "settings"] as const,
  },
} as const;
