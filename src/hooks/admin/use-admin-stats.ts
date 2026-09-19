"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminStatsApi } from "@/services/api/admin/stats";
import { adminDevDataApi } from "@/services/api/admin/dev-data";
import { useAdminAuth } from "@/features/admin/auth-store";
import { queryKeys } from "@/lib/query-keys";

/** Shared admin token + auto sign-out on 401 */
export function useAdminSession() {
  const session = useAdminAuth((s) => s.session);
  const clearSession = useAdminAuth((s) => s.clearSession);

  const validateSession = useQuery({
    queryKey: queryKeys.admin.session(session?.token ?? null),
    queryFn: ({ signal }) => adminStatsApi.dashboard(session!.token, signal),
    enabled: Boolean(session?.token),
    retry: false,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (validateSession.error) {
      const status = (validateSession.error as { status?: number }).status;
      if (status === 401) clearSession();
    }
  }, [validateSession.error, clearSession]);

  return {
    token: session?.token ?? null,
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.token),
    isValidating: validateSession.isFetching,
  };
}

export function useAdminDashboard() {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.stats(token),
    queryFn: ({ signal }) => adminStatsApi.dashboard(token!, signal),
    enabled: Boolean(token),
  });
}

export function useAdminAnalytics(days = 14) {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: [...queryKeys.admin.analytics(token), days],
    queryFn: ({ signal }) => adminStatsApi.analytics(token!, signal),
    enabled: Boolean(token),
  });
}

export function useDevDataControls() {
  const { token } = useAdminSession();
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const seedSample = useMutation({
    mutationFn: () => adminDevDataApi.seedSample(token!),
    onSuccess: invalidateAll,
  });
  const clearSample = useMutation({
    mutationFn: () => adminDevDataApi.clearSample(token!),
    onSuccess: invalidateAll,
  });
  const resetAll = useMutation({
    mutationFn: () => adminDevDataApi.resetAll(token!),
    onSuccess: invalidateAll,
  });

  return { seedSample, clearSample, resetAll };
}
