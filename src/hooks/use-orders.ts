"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/services/api/orders";
import { queryKeys } from "@/lib/query-keys";
import type { Order, PlaceOrderInput } from "@/types";

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => ordersApi.place(input),
  });
}

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: queryKeys.order(orderNumber),
    queryFn: ({ signal }) => ordersApi.getByOrderNumber(orderNumber, signal),
    enabled: orderNumber.trim().length > 0,
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}
