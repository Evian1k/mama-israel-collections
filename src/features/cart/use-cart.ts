"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useCartStore, cartCount, cartSubtotal } from "./store";
import type { AddToCartInput, CartItem } from "@/types/cart";

/**
 * Hydration-safe cart access.
 * Zustand persist rehydrates from localStorage after mount; we expose that
 * via useSyncExternalStore so SSR renders the skeleton and the client flips
 * to real data with zero hydration-mismatch warnings (no setState-in-effect).
 */
export function useCart(): {
  items: CartItem[];
  hydrated: boolean;
  count: number;
  subtotal: number;
  addItem: (input: AddToCartInput) => CartItem;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
} {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const subscribeHydration = useCallback(
    (onStoreChange: () => void) => useCartStore.persist.onFinishHydration(onStoreChange),
    []
  );
  const getHydrationSnapshot = useCallback(() => useCartStore.persist.hasHydrated(), []);
  const getServerSnapshot = useCallback(() => false, []);

  const hydrated = useSyncExternalStore(
    subscribeHydration,
    getHydrationSnapshot,
    getServerSnapshot
  );

  const safeItems = hydrated ? items : [];

  return {
    items: safeItems,
    hydrated,
    count: cartCount(safeItems),
    subtotal: cartSubtotal(safeItems),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };
}
