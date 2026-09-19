"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ApiError } from "@/services/api/client";
import { adminAuthApi } from "@/services/api/admin/auth";
import type { AdminSession } from "@/types";

/**
 * Admin session (dev adapter for Phase 1).
 * Token + user are persisted to localStorage so the owner stays signed in
 * while browsing the dashboard. Every admin API call sends the token; a 401
 * anywhere invalidates the session and returns the user to /admin/login.
 *
 * Phase 2: replaced by backend-issued JWT refresh flow — this interface stays.
 */

interface AdminAuthState {
  session: AdminSession | null;
  signIn: (email: string, password: string) => Promise<AdminSession>;
  /** Replace the stored session (e.g. after adopting a refreshed one) */
  setSession: (session: AdminSession) => void;
  signOut: () => Promise<void>;
  clearSession: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      session: null,

      signIn: async (email, password) => {
        const session = await adminAuthApi.login(email, password);
        set({ session });
        return session;
      },

      setSession: (session) => set({ session }),

      signOut: async () => {
        const token = get().session?.token;
        if (token) {
          try {
            await adminAuthApi.logout(token);
          } catch {
            // best-effort — local session is cleared regardless
          }
        }
        set({ session: null });
      },

      clearSession: () => set({ session: null }),
    }),
    {
      name: "mic-admin-session-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/** Convenience: current token for API calls */
export function getAdminToken(): string | null {
  return useAdminAuth.getState().session?.token ?? null;
}

/** Throws (logged) when a 401 comes back — call from mutation/query onError */
export function handleAdminUnauthorized(
  error: unknown,
  onUnauthorized: () => void
): void {
  if (error instanceof ApiError && error.isUnauthorized) {
    useAdminAuth.getState().clearSession();
    onUnauthorized();
  }
}
