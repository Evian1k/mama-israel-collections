"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * ============================================================================
 * ADMIN RUNTIME CONTEXT — server-provided facts about the data layer.
 * ============================================================================
 * The admin layout (server component) reads the runtime mode server-side and
 * provides it here, so client views can hide development-only tooling (the
 * in-memory dev-data controls) when the production backend is in charge.
 * ============================================================================
 */

export interface AdminRuntime {
  /** True when the Fastify + PostgreSQL backend serves the data plane. */
  backendMode: boolean;
}

const AdminRuntimeContext = createContext<AdminRuntime>({ backendMode: false });

export function AdminRuntimeProvider({
  value,
  children,
}: {
  value: AdminRuntime;
  children: ReactNode;
}) {
  return <AdminRuntimeContext.Provider value={value}>{children}</AdminRuntimeContext.Provider>;
}

export function useAdminRuntime(): AdminRuntime {
  return useContext(AdminRuntimeContext);
}
