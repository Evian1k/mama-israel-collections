"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AddToCartInput, CartItem } from "@/types/cart";

/**
 * Cart state — client-side, persisted to localStorage ("mic-cart-v1").
 * Lines are keyed by product + size + colour. The server re-validates
 * stock and pricing at checkout; `maxQuantity` only guides the UI.
 */

interface CartState {
  items: CartItem[];
  addItem: (input: AddToCartInput) => CartItem;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

function lineKey(productId: string, size: string | null, color: string | null): string {
  return `${productId}::${size ?? "one"}::${color ?? "default"}`;
}

function clampQuantity(quantity: number, maxQuantity: number): number {
  const max = Math.max(1, maxQuantity);
  return Math.min(Math.max(1, Math.round(quantity || 1)), max);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) => {
        const key = lineKey(input.productId, input.size ?? null, input.color ?? null);
        const maxQuantity = Math.max(1, input.maxQuantity ?? 99);
        const existing = get().items.find((item) => item.key === key);

        if (existing) {
          const nextQuantity = clampQuantity(existing.quantity + input.quantity, Math.min(maxQuantity, existing.maxQuantity));
          const items = get().items.map((item) =>
            item.key === key ? { ...item, quantity: nextQuantity } : item
          );
          set({ items });
          return { ...existing, quantity: nextQuantity };
        }

        const item: CartItem = {
          key,
          productId: input.productId,
          slug: input.slug,
          name: input.name,
          imageUrl: input.imageUrl ?? null,
          price: input.price,
          compareAtPrice: input.compareAtPrice ?? null,
          size: input.size ?? null,
          color: input.color ?? null,
          quantity: clampQuantity(input.quantity, maxQuantity),
          maxQuantity,
          sku: input.sku,
        };
        set({ items: [...get().items, item] });
        return item;
      },

      updateQuantity: (key, quantity) => {
        const items = get()
          .items.map((item) =>
            item.key === key
              ? { ...item, quantity: clampQuantity(quantity, item.maxQuantity) }
              : item
          )
          // Self-heal: drop lines whose product stock vanished
          .filter((item) => item.maxQuantity > 0);
        set({ items });
      },

      removeItem: (key) => {
        set({ items: get().items.filter((item) => item.key !== key) });
      },

      clearCart: () => set({ items: [] }),
    }),
    {
      name: "mic-cart-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/* ---------------------------------- selectors --------------------------------- */

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
