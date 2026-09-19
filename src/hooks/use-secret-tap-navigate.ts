"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Hidden owner gesture — rapid-tap an element (e.g. the brand name) a set
 * number of times within a short window to navigate to a private page.
 *
 * The gesture is deliberately invisible: taps 1…N-1 fall through to the
 * element's normal behaviour (callers receive the event and may preventDefault
 * only on the final tap), nothing is rendered or announced, and the counter
 * resets after the window expires or the target is reached.
 */
export function useSecretTapNavigate(
  target: string,
  { taps = 5, windowMs = 3000 }: { taps?: number; windowMs?: number } = {}
) {
  const router = useRouter();
  const timestamps = useRef<number[]>([]);

  return useCallback(
    (event?: { preventDefault(): void }) => {
      const now = Date.now();
      timestamps.current = [
        ...timestamps.current.filter((t) => now - t < windowMs),
        now,
      ];

      if (timestamps.current.length >= taps) {
        timestamps.current = [];
        event?.preventDefault();
        router.push(target);
      }
    },
    [router, target, taps, windowMs]
  );
}
