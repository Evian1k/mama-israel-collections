"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * True only after the component has mounted on the client.
 *
 * Used to keep client-chrome that depends on client-fetched settings
 * (e.g. WhatsApp buttons) out of the server-rendered HTML, so the
 * first client render always matches the server and React never
 * reports a hydration mismatch when settings resolve before hydration.
 *
 * Implemented with useSyncExternalStore: the server snapshot is `false`,
 * the client snapshot is `true` — no effects, no extra render state.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
