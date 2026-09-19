"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminLogin } from "@/hooks/admin/use-admin-data";

/**
 * Dev-adapter login (Phase 1). Real authentication arrives with the Phase 2
 * backend — this form simply posts to POST /api/admin/auth/login and stores
 * the issued session locally.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const login = useAdminLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    try {
      await login.mutateAsync({ email, password });
      router.replace("/admin");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign in failed. Please try again."
      );
    }
  };

  const fieldError = login.isError && !error
    ? (login.error instanceof Error ? login.error.message : "Sign in failed.")
    : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-black/5 sm:p-8"
      noValidate
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="admin-email">Email</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="email"
            placeholder="admin@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={login.isPending}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={login.isPending}
              className="pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {(error || fieldError) ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error || fieldError}
          </p>
        ) : null}

        <Button type="submit" className="w-full gap-2" disabled={login.isPending}>
          {login.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LockKeyhole className="size-4" aria-hidden="true" />
          )}
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
