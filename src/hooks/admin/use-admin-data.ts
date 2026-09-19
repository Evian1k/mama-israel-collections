"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminProductsApi } from "@/services/api/admin/products";
import { adminCategoriesApi } from "@/services/api/admin/categories";
import { adminSettingsApi } from "@/services/api/admin/settings";
import { adminOrdersApi } from "@/services/api/admin/orders";
import { adminCustomersApi } from "@/services/api/admin/customers";
import { useAdminAuth } from "@/features/admin/auth-store";
import { useAdminSession } from "./use-admin-stats";
import { queryKeys } from "@/lib/query-keys";
import type {
  CreateCategoryInput,
  CreateProductInput,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductQuery,
  StoreSettings,
  UpdateCategoryInput,
  UpdateProductInput,
} from "@/types";

/* --------------------------------- auth ---------------------------------- */

export function useAdminLogin() {
  const signIn = useAdminAuth((s) => s.signIn);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
  });
}

/* -------------------------------- products -------------------------------- */

export function useAdminProducts(query: ProductQuery = {}) {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.products(token, query),
    queryFn: ({ signal }) => adminProductsApi.list(token!, query, signal),
    enabled: Boolean(token),
    placeholderData: (previous) => previous,
  });
}

export function useAdminProduct(id: string) {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.product(token, id),
    queryFn: ({ signal }) => adminProductsApi.get(token!, id, signal),
    enabled: Boolean(token) && Boolean(id),
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useAdminProductMutations() {
  const { token } = useAdminSession();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateProductInput) => adminProductsApi.create(token!, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProductInput }) =>
      adminProductsApi.update(token!, id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminProductsApi.remove(token!, id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* --------------------------------- orders --------------------------------- */

export interface AdminOrderListQuery {
  page?: number;
  status?: OrderStatus | "all";
  paymentStatus?: PaymentStatus | "all";
  search?: string;
}

export function useAdminOrders(query: AdminOrderListQuery = {}) {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.orders(token, query),
    queryFn: ({ signal }) => adminOrdersApi.list(token!, query, signal),
    enabled: Boolean(token),
    placeholderData: (previous) => previous,
  });
}

export function useAdminOrder(idOrNumber: string) {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.order(token, idOrNumber),
    queryFn: ({ signal }) => adminOrdersApi.get(token!, idOrNumber, signal),
    enabled: Boolean(token) && Boolean(idOrNumber),
    retry: (failureCount, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useAdminOrderMutations() {
  const { token } = useAdminSession();
  const queryClient = useQueryClient();

  const invalidate = (order?: Order) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
    if (order) {
      queryClient.invalidateQueries({ queryKey: ["orders", "public", order.orderNumber] });
    }
  };

  const updateStatus = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      adminOrdersApi.updateStatus(token!, id, { status, note }),
    onSuccess: invalidate,
  });

  const setPaymentStatus = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: PaymentStatus; note?: string }) =>
      adminOrdersApi.setPaymentStatus(token!, id, { status, note }),
    onSuccess: invalidate,
  });

  return { updateStatus, setPaymentStatus };
}

/* -------------------------------- customers ------------------------------- */

export function useAdminCustomers() {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.customers(token),
    queryFn: ({ signal }) => adminCustomersApi.list(token!, signal),
    enabled: Boolean(token),
  });
}

export function useAdminCustomer(id: string) {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: [...queryKeys.admin.customers(token), "detail", id],
    queryFn: ({ signal }) => adminCustomersApi.get(token!, id, signal),
    enabled: Boolean(token) && Boolean(id),
  });
}

/* ------------------------------- categories ------------------------------- */

export function useAdminCategories() {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.categories(token),
    queryFn: ({ signal }) => adminCategoriesApi.list(token!, signal),
    enabled: Boolean(token),
  });
}

export function useAdminCategoryMutations() {
  const { token } = useAdminSession();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "stats"] });
  };

  const create = useMutation({
    mutationFn: (input: CreateCategoryInput) => adminCategoriesApi.create(token!, input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      adminCategoriesApi.update(token!, id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminCategoriesApi.remove(token!, id),
    onSuccess: invalidate,
  });

  return { create, update, remove };
}

/* -------------------------------- settings -------------------------------- */

export function useAdminSettings() {
  const { token } = useAdminSession();
  return useQuery({
    queryKey: queryKeys.admin.settings(token),
    queryFn: ({ signal }) => adminSettingsApi.get(token!, signal),
    enabled: Boolean(token),
  });
}

export function useAdminSettingsUpdate() {
  const { token } = useAdminSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<StoreSettings>) => adminSettingsApi.update(token!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings(token) });
      queryClient.invalidateQueries({ queryKey: queryKeys.storeSettings() });
    },
  });
}
