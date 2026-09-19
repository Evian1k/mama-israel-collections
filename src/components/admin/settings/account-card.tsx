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
import { useAdminSession } from "@/hooks/admin/use-admin-stats";
import { useAdminAuth } from "@/features/admin/auth-store";
import { adminAuthApi } from "@/services/api/admin/auth";

/** Mirrors the server rule: at least 10 characters with letters and numbers */
const NEW_PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;
const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Admin → Settings → Account.
 * Rotate the admin password (and optionally the sign-in email). The current
 * password is always required — changing credentials must be authorised.
 * On success the fresh session replaces the stored one immediately.
 */
export function AccountCard() {
  const { token } = useAdminSession();
  const setSession = useAdminAuth((s) => s.setSession);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emailTrimmed = newEmail.trim();
  const somethingToSave = emailTrimmed !== "" || newPassword !== "";

  const validate = (): string | null => {
    if (!currentPassword) return "Enter your current password to confirm this change.";
    if (!somethingToSave) {
      return "Enter a new email or a new password — there is nothing to change yet.";
    }
    if (emailTrimmed && !EMAIL_RULE.test(emailTrimmed)) {
      return "Enter a valid email address.";
    }
    if (newPassword && !NEW_PASSWORD_RULE.test(newPassword)) {
      return "Choose a password of at least 10 characters including letters and numbers.";
    }
    if (newPassword && confirmPassword !== newPassword) {
      return "The new passwords do not match.";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Your session expired — please sign in again.");
      return;
    }
    const validationError = validate();
    if (validationError) {
      setError(validationError);
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
      setCurrentPassword("");
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Account updated");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update the account. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-gold" aria-hidden="true" />
          Admin email or password
        </CardTitle>
        <CardDescription>
          Change how you sign in to this admin panel. The current password is always required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="account-current-password">Current password</Label>
              <div className="relative">
                <Input
                  id="account-current-password"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  disabled={saving}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "Hide current password" : "Show current password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                >
                  {showCurrent ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-new-email">New admin email (optional)</Label>
              <Input
                id="account-new-email"
                type="email"
                autoComplete="email"
                placeholder="Leave empty to keep the current email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-new-password">New password (optional)</Label>
              <Input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 10 characters"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-confirm-password">Confirm new password</Label>
              <Input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat the new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={saving || !newPassword}
                aria-describedby="account-confirm-hint"
              />
              <p id="account-confirm-hint" className="text-xs text-muted-foreground">
                Passwords need at least 10 characters with letters and numbers.
              </p>
            </div>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div>
            <Button type="submit" className="gap-2 rounded-full" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="size-4" aria-hidden="true" />
              )}
              {saving ? "Saving…" : "Update sign-in"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
