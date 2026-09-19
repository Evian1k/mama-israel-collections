"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/features/admin/auth-store";
import { useAdminSession } from "@/hooks/admin/use-admin-stats";
import { useQueryClient } from "@tanstack/react-query";
import { adminAuthApi } from "@/services/api/admin/auth";

/** Mirrors the server rule: at least 10 characters with letters and numbers */
const NEW_PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forced first-run password change (admin onboarding).
 * Rendered INSTEAD of the admin panel whenever the session carries
 * mustChangePassword — it cannot be dismissed or bypassed by navigation,
 * because the shell never mounts the nav or children while it applies.
 */
export function ForcePasswordChange() {
  const { token } = useAdminSession();
  const setSession = useAdminAuth((s) => s.setSession);
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEmailField, setShowEmailField] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Your session expired — please sign in again.");
      return;
    }
    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (!NEW_PASSWORD_RULE.test(newPassword)) {
      setError("Choose a password of at least 10 characters including letters and numbers.");
      return;
    }
    if (confirmPassword !== newPassword) {
      setError("The new passwords do not match.");
      return;
    }
    const emailTrimmed = newEmail.trim();
    if (emailTrimmed && !EMAIL_RULE.test(emailTrimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      const session = await adminAuthApi.changeCredentials(token, {
        currentPassword,
        newPassword,
        email: emailTrimmed || undefined,
      });
      setSession(session);
      // Drop the cached session check (it belongs to the old token) so the
      // shell's adoption effect can never resurrect the old flag.
      void queryClient.invalidateQueries({ queryKey: ["admin", "session-check"] });
      toast.success("Password updated — welcome!");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update the password. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Card className="shadow-xl shadow-black/5">
          <CardHeader className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <ShieldCheck className="size-6" />
            </span>
            <CardTitle className="font-display text-xl font-bold">Secure your store</CardTitle>
            <CardDescription>
              This account still uses the setup password. Choose a new password before managing
              the store.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="force-current-password">Current password</Label>
                <Input
                  id="force-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="force-new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="force-new-password"
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 10 characters with letters and numbers"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={saving}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {showNewPassword ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="force-confirm-password">Confirm new password</Label>
                <Input
                  id="force-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={saving}
                />
              </div>

              {showEmailField ? (
                <div className="space-y-2">
                  <Label htmlFor="force-new-email">New admin email (optional)</Label>
                  <Input
                    id="force-new-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Leave empty to keep the current email"
                    value={newEmail}
                    onChange={(event) => setNewEmail(event.target.value)}
                    disabled={saving}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-primary underline underline-offset-4"
                  onClick={() => setShowEmailField(true)}
                >
                  Change the admin email too (optional)
                </button>
              )}

              {error ? (
                <p
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}

              <Button type="submit" className="w-full gap-2" disabled={saving}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="size-4" aria-hidden="true" />
                )}
                {saving ? "Saving…" : "Save and continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
