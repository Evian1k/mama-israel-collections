import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin Sign In",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Warm brand backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--color-secondary),transparent_55%),radial-gradient(ellipse_at_bottom_right,var(--color-gold-soft),transparent_50%)]"
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary font-display text-lg font-bold text-primary-foreground shadow-lg shadow-primary/25"
          >
            MI
          </span>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to manage Mama Israel Collections
          </p>
        </div>
        <AdminLoginForm />
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          Private area for the store owner. Credentials are configured in the
          server environment (see <code className="rounded bg-secondary px-1">.env</code> / README).
        </p>
      </div>
    </div>
  );
}
