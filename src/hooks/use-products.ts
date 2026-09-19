"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { productsApi } from "@/services/api/products";
import { queryKeys } from "@/lib/query-keys";
import type { Product, ProductQuery } from "@/types";

const DEFAULT_PAGE_SIZE = 12;

/** Infinite product list (Load more) for the shop grid */
export function useProducts(query: ProductQuery = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.products({ limit: DEFAULT_PAGE_SIZE, ...query }),
    queryFn: ({ signal, pageParam }) =>
      productsApi.list({ ...query, limit: DEFAULT_PAGE_SIZE, page: pageParam as number }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.page + 1 : undefined,
  });
}

export function useProduct(slug: string, opts: { initialData?: Product } = {}) {
  return useQuery({
    queryKey: queryKeys.product(slug),
    queryFn: ({ signal }) => productsApi.bySlug(slug, signal),
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
    initialData: opts.initialData,
  });
}

export function useFeaturedProducts(limit = 8, opts: { initialData?: Product[] } = {}) {
  return useQuery({
    queryKey: queryKeys.featuredProducts(limit),
    queryFn: ({ signal }) => productsApi.featured(limit, signal),
    staleTime: 60 * 1000,
    initialData: opts.initialData,
  });
}

export function useNewArrivals(limit = 8, opts: { initialData?: Product[] } = {}) {
  return useQuery({
    queryKey: queryKeys.newArrivals(limit),
    queryFn: ({ signal }) => productsApi.newArrivals(limit, signal),
    staleTime: 60 * 1000,
    initialData: opts.initialData,
  });
}
