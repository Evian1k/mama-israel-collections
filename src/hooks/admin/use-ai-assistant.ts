"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminAiAssistantApi } from "@/services/api/admin/ai-assistant";
import { useAdminSession } from "./use-admin-stats";
import { queryKeys } from "@/lib/query-keys";

/**
 * AI Product Assistant — parses the owner's description into product drafts.
 * Publishing still goes through useAdminProductMutations().create so the
 * products cache invalidates exactly like the manual form.
 */
export function useAiAssistantParse() {
  const { token } = useAdminSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { text: string; imageUrls?: string[] }) =>
      adminAiAssistantApi.parse(token!, input),
    onSuccess: () => {
      // Categories are shown for mapping context; keep them fresh.
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.categories(token ?? null) });
    },
  });
}
