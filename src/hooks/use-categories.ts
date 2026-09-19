"use client";

import { useQuery } from "@tanstack/react-query";
import { categoriesApi } from "@/services/api/categories";
import { queryKeys } from "@/lib/query-keys";
import type { Category } from "@/types";

export function useCategories(opts: { includeInactive?: boolean; initialData?: Category[] } = {}) {
  return useQuery({
    queryKey: queryKeys.categories(opts),
    queryFn: ({ signal }) => categoriesApi.list({ includeInactive: opts.includeInactive }, signal),
    staleTime: 60 * 1000,
    initialData: opts.initialData,
  });
}
