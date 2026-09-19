"use client";

import { useQuery } from "@tanstack/react-query";
import { storeApi } from "@/services/api/store";
import { queryKeys } from "@/lib/query-keys";
import type { StoreSettings } from "@/types";

/** Store settings (name, WhatsApp number, delivery config...) */
export function useStoreSettings(initialData?: StoreSettings) {
  return useQuery({
    queryKey: queryKeys.storeSettings(),
    queryFn: ({ signal }) => storeApi.getSettings(signal),
    staleTime: 5 * 60 * 1000,
    initialData,
  });
}
