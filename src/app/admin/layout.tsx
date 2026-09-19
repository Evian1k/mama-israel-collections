import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminRuntimeProvider } from "@/features/admin/runtime-context";
import { isBackendMode } from "@/lib/runtime-mode";

export const metadata: Metadata = {
  title: {
    default: "Admin Panel",
    template: "%s | Admin — Mama Israel Collections",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Read once per request on the server — client views use it to hide the
  // development-only dev-data controls when the production backend is live.
  const runtime = { backendMode: isBackendMode() };
  return (
    <AdminRuntimeProvider value={runtime}>
      <AdminShell>{children}</AdminShell>
    </AdminRuntimeProvider>
  );
}
