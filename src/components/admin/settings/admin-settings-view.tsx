"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertTriangle,
  FlaskConical,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/admin/page-header";
import { AccountCard } from "@/components/admin/settings/account-card";
import { ProductionCheckCard } from "@/components/admin/settings/production-check-card";
import { ErrorState } from "@/components/shared/error-state";
import { useAdminSettings, useAdminSettingsUpdate } from "@/hooks/admin/use-admin-data";
import { useDevDataControls, useAdminSession } from "@/hooks/admin/use-admin-stats";
import { useAdminRuntime } from "@/features/admin/runtime-context";
import { normaliseLocation } from "@/features/checkout/summary";
import { uploadImages } from "@/services/api/admin/uploads";
import { formatPrice } from "@/lib/format";
import type { StoreSettings } from "@/types";

/* ---------------------------------------------------------------------------
 * Client schema — mirrors the server's settingsPatchSchema rules. The form
 * keeps fee amounts as strings while typing; the payload sent to the API is
 * built in toSettingsPatch() below (numbers / nulls exactly as the server
 * contract expects).
 * ------------------------------------------------------------------------- */

/** Full URL or empty — mirrors the server's socialLinks rules */
const socialLinkField = (label: string) =>
  z
    .string()
    .trim()
    .url(`Enter a full ${label} URL, e.g. https://instagram.com/…`)
    .max(200, "Keep the link under 200 characters")
    .or(z.literal(""));

const settingsFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Store name must be at least 2 characters")
      .max(80, "Keep the store name under 80 characters"),
    shortName: z.string().trim().max(40, "Keep the short name under 40 characters"),
    tagline: z.string().trim().max(80, "Keep the tagline under 80 characters"),
    description: z.string().trim().max(600, "Keep the description under 600 characters"),
    email: z.union([z.string().trim().email("Enter a valid email address"), z.literal("")]),
    phone: z.string().trim().max(24, "Keep the phone number under 24 characters"),
    whatsappNumber: z
      .string()
      .trim()
      .max(24, "Keep the number under 24 characters")
      .refine(
        (v) =>
          v === "" ||
          /^(?:\+?254|0)(?:7|1)\d{8}$|^\+?\d{9,15}$/.test(v.replace(/[\s-]/g, "")),
        "Use a valid phone number, e.g. 254712345678"
      ),
    location: z.string().trim().max(200, "Keep the location under 200 characters"),
    logoUrl: z.string().trim().max(500, "Keep the logo URL under 500 characters"),
    socialLinks: z.object({
      instagram: socialLinkField("Instagram"),
      facebook: socialLinkField("Facebook"),
      tiktok: socialLinkField("TikTok"),
      twitter: socialLinkField("X (Twitter)"),
    }),
    flatFeeEnabled: z.boolean(),
    flatFeeAmount: z.string().trim(),
    freeDeliveryEnabled: z.boolean(),
    freeAboveAmount: z.string().trim(),
    deliveryNote: z.string().trim().max(300, "Keep the note under 300 characters"),
    deliveryZones: z
      .array(
        z.object({
          /** Stable id — kept for existing rows, fresh for new ones */
          id: z.string(),
          name: z
            .string()
            .trim()
            .min(1, "Give the zone a name")
            .max(60, "Keep the zone name under 60 characters"),
          fee: z.string().trim(),
        })
      )
      .max(20, "A store can have at most 20 delivery zones"),
    payOnDeliveryEnabled: z.boolean(),
    mpesaEnabled: z.boolean(),
    mpesaBusinessName: z.string().trim().max(80, "Keep the business name under 80 characters"),
    tillEnabled: z.boolean(),
    tillNumber: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^\d{5,15}$/.test(v),
        "Enter a till number — digits only (5 to 15 digits)"
      ),
    paybillEnabled: z.boolean(),
    paybillNumber: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^\d{5,15}$/.test(v),
        "Enter a paybill number — digits only (5 to 15 digits)"
      ),
    mpesaAccountNumber: z.string().trim().max(60, "Keep the account number under 60 characters"),
    mpesaInstructions: z
      .string()
      .trim()
      .max(1000, "Keep the payment instructions under 1,000 characters"),
    lowStockThreshold: z
      .string()
      .trim()
      .refine(
        (v) => /^\d+$/.test(v) && Number(v) <= 1000,
        "Enter a whole number between 0 and 1,000"
      ),
  })
  .superRefine((values, ctx) => {
    if (values.flatFeeEnabled) {
      const raw = values.flatFeeAmount;
      const parsed = Number(raw);
      if (raw === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 100_000) {
        ctx.addIssue({
          code: "custom",
          path: ["flatFeeAmount"],
          message: "Enter a flat fee between 0 and 100,000, or switch the fee off.",
        });
      }
    }
    if (values.freeDeliveryEnabled) {
      const raw = values.freeAboveAmount;
      const parsed = Number(raw);
      if (raw === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) {
        ctx.addIssue({
          code: "custom",
          path: ["freeAboveAmount"],
          message: "Enter an amount between 0 and 10,000,000, or switch free delivery off.",
        });
      }
    }
    values.deliveryZones.forEach((zone, index) => {
      const raw = zone.fee;
      const parsed = Number(raw);
      if (raw === "" || !Number.isFinite(parsed) || parsed < 0 || parsed > 100_000) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryZones", index, "fee"],
          message: "Enter a fee between 0 and 100,000 (use 0 for free pick-up).",
        });
      }
    });
    // Zone names must be unique (the checkout matches locations by name)
    const seenNames = new Map<string, number>();
    values.deliveryZones.forEach((zone, index) => {
      const key = normaliseLocation(zone.name);
      if (!key) return;
      if ((seenNames.get(key) ?? 0) > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["deliveryZones", index, "name"],
          message: "Duplicate zone name — each zone needs a unique name.",
        });
      }
      seenNames.set(key, (seenNames.get(key) ?? 0) + 1);
    });
  });

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const EMPTY_FORM_VALUES: SettingsFormValues = {
  name: "",
  shortName: "",
  tagline: "",
  description: "",
  email: "",
  phone: "",
  whatsappNumber: "",
  location: "",
  logoUrl: "",
  socialLinks: { instagram: "", facebook: "", tiktok: "", twitter: "" },
  flatFeeEnabled: false,
  flatFeeAmount: "",
  freeDeliveryEnabled: false,
  freeAboveAmount: "",
  deliveryNote: "",
  deliveryZones: [],
  payOnDeliveryEnabled: true,
  mpesaEnabled: false,
  mpesaBusinessName: "",
  tillEnabled: false,
  tillNumber: "",
  paybillEnabled: false,
  paybillNumber: "",
  mpesaAccountNumber: "",
  mpesaInstructions: "",
  lowStockThreshold: "",
};

/** Stable per-row ids: keep existing, fresh for new rows */
function newZoneId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `z_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Logo upload limits — same allow-list as the product image uploader */
const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_LOGO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function toFormValues(settings: StoreSettings): SettingsFormValues {
  return {
    name: settings.name,
    shortName: settings.shortName,
    tagline: settings.tagline,
    description: settings.description,
    email: settings.email ?? "",
    phone: settings.phone ?? "",
    whatsappNumber: settings.whatsappNumber ?? "",
    location: settings.location ?? "",
    logoUrl: settings.logoUrl ?? "",
    socialLinks: {
      instagram: settings.socialLinks?.instagram ?? "",
      facebook: settings.socialLinks?.facebook ?? "",
      tiktok: settings.socialLinks?.tiktok ?? "",
      twitter: settings.socialLinks?.twitter ?? "",
    },
    flatFeeEnabled: settings.delivery?.flatFee !== null && settings.delivery?.flatFee !== undefined,
    flatFeeAmount:
      settings.delivery?.flatFee !== null && settings.delivery?.flatFee !== undefined
        ? String(settings.delivery.flatFee)
        : "",
    freeDeliveryEnabled:
      settings.delivery?.freeAboveThreshold !== null &&
      settings.delivery?.freeAboveThreshold !== undefined,
    freeAboveAmount:
      settings.delivery?.freeAboveThreshold !== null &&
      settings.delivery?.freeAboveThreshold !== undefined
        ? String(settings.delivery.freeAboveThreshold)
        : "",
    deliveryNote: settings.delivery?.note ?? "",
    deliveryZones: (settings.delivery?.zones ?? []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      fee: String(zone.fee),
    })),
    payOnDeliveryEnabled: settings.payments?.payOnDeliveryEnabled ?? true,
    mpesaEnabled: settings.payments?.mpesa.enabled ?? false,
    mpesaBusinessName: settings.payments?.mpesa.businessName ?? "",
    tillEnabled: settings.payments?.mpesa.tillEnabled ?? false,
    tillNumber: settings.payments?.mpesa.tillNumber ?? "",
    paybillEnabled: settings.payments?.mpesa.paybillEnabled ?? false,
    paybillNumber: settings.payments?.mpesa.paybillNumber ?? "",
    mpesaAccountNumber: settings.payments?.mpesa.accountNumber ?? "",
    mpesaInstructions: settings.payments?.mpesa.instructions ?? "",
    lowStockThreshold: String(settings.lowStockThreshold ?? 0),
  };
}

function toSettingsPatch(values: SettingsFormValues): Partial<StoreSettings> {
  return {
    name: values.name,
    shortName: values.shortName,
    tagline: values.tagline,
    description: values.description,
    email: values.email,
    phone: values.phone,
    whatsappNumber: values.whatsappNumber,
    location: values.location,
    // "" clears the logo; the upload flow stores an absolute URL
    logoUrl: values.logoUrl,
    socialLinks: {
      instagram: values.socialLinks.instagram,
      facebook: values.socialLinks.facebook,
      tiktok: values.socialLinks.tiktok,
      twitter: values.socialLinks.twitter,
    },
    delivery: {
      flatFee: values.flatFeeEnabled ? Number(values.flatFeeAmount) : null,
      freeAboveThreshold: values.freeDeliveryEnabled ? Number(values.freeAboveAmount) : null,
      note: values.deliveryNote,
      // Full replacement array — the server swaps the whole zone list
      zones: values.deliveryZones.map((zone) => ({
        id: zone.id,
        name: zone.name.trim(),
        fee: Number(zone.fee),
      })),
    },
    // Exactly the StorePaymentsSettings contract shape — booleans always sent
    payments: {
      payOnDeliveryEnabled: values.payOnDeliveryEnabled,
      mpesa: {
        enabled: values.mpesaEnabled,
        businessName: values.mpesaBusinessName,
        tillEnabled: values.tillEnabled,
        tillNumber: values.tillNumber,
        paybillEnabled: values.paybillEnabled,
        paybillNumber: values.paybillNumber,
        accountNumber: values.mpesaAccountNumber,
        instructions: values.mpesaInstructions,
      },
    },
    lowStockThreshold: Number(values.lowStockThreshold),
  };
}

/** Mirrors the server fee logic (createOrder) for the live checkout preview */
function deliveryPreviewLine(
  flatFee: number | null,
  freeAbove: number | null,
  symbol: string
): string {
  if (flatFee === null) {
    return "Delivery: to be confirmed with the customer before dispatch.";
  }
  if (freeAbove !== null) {
    return `Delivery: ${formatPrice(flatFee, symbol)} — FREE above ${formatPrice(freeAbove, symbol)}`;
  }
  return `Delivery: ${formatPrice(flatFee, symbol)} on every order.`;
}

/** Honest one-line summary of what customers will choose at checkout */
function paymentsPreviewLines(values: {
  payOnDeliveryEnabled: boolean;
  mpesaEnabled: boolean;
  mpesaBusinessName: string;
  tillNumber: string;
  paybillNumber: string;
  mpesaAccountNumber: string;
  mpesaInstructions: string;
}): string[] {
  if (!values.payOnDeliveryEnabled && !values.mpesaEnabled) {
    return [
      "No payment methods are enabled — customers will be asked to contact you on WhatsApp to order.",
    ];
  }

  const lines: string[] = [];
  if (values.payOnDeliveryEnabled) {
    lines.push("Pay on delivery — pay cash when the order arrives.");
  }
  if (values.mpesaEnabled) {
    lines.push(
      `Pay with M-Pesa — paying to ${values.mpesaBusinessName || "the store name"}, amount shown live at checkout.`
    );
    if (values.tillNumber) {
      lines.push(`Till Number ${values.tillNumber} — Lipa na M-Pesa → Buy Goods and Services.`);
    }
    if (values.paybillNumber) {
      lines.push(
        `Paybill Number ${values.paybillNumber}${values.mpesaAccountNumber ? `, Account ${values.mpesaAccountNumber}` : ""} — Lipa na M-Pesa → Pay Bill.`
      );
    }
    lines.push(
      values.mpesaInstructions
        ? "Your custom payment instructions are shown instead of the generated steps."
        : "Clear numbered Lipa na M-Pesa steps are generated for the customer automatically."
    );
  }
  return lines;
}

/**
 * Uploads return same-origin paths (/uploads/…); the settings API stores full
 * URLs (it validates with URL rules), so absolutise against the current origin.
 */
function toAbsoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).toString();
  } catch {
    return path;
  }
}

/* ---------------------------------------------------------------------------
 * Small building blocks
 * ------------------------------------------------------------------------- */

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function describeId(id: string, error?: string): string | undefined {
  return error ? `${id}-error` : undefined;
}

function SettingsFormSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Loading settings…</span>
      <div aria-hidden="true" className="mx-auto max-w-4xl space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-56" />
            <div className="mt-5 space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Main view
 * ------------------------------------------------------------------------- */

export function AdminSettingsView() {
  const { data: settings, isLoading, isError, error, refetch } = useAdminSettings();
  const updateSettings = useAdminSettingsUpdate();
  const { seedSample, clearSample, resetAll } = useDevDataControls();
  const { backendMode } = useAdminRuntime();
  const { token } = useAdminSession();

  const form = useForm<SettingsFormValues, unknown, SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: EMPTY_FORM_VALUES,
    mode: "onTouched",
  });

  const zonesArray = useFieldArray({ control: form.control, name: "deliveryZones" });
  const logoUrl = form.watch("logoUrl");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Adopt server settings whenever a fresh, untouched load arrives.
  // (Render stays authoritative; dirty forms are never clobbered — saving and
  // the dev-data reset call form.reset() explicitly with the new truth.)
  useEffect(() => {
    if (!settings) return;
    if (form.formState.isDirty) return;
    form.reset(toFormValues(settings));
  }, [settings, form]);

  const flatFeeEnabled = form.watch("flatFeeEnabled");
  const flatFeeAmountRaw = form.watch("flatFeeAmount");
  const freeDeliveryEnabled = form.watch("freeDeliveryEnabled");
  const freeAboveAmountRaw = form.watch("freeAboveAmount");

  const payOnDeliveryEnabled = form.watch("payOnDeliveryEnabled");
  const mpesaEnabled = form.watch("mpesaEnabled");
  const tillEnabled = form.watch("tillEnabled");
  const paybillEnabled = form.watch("paybillEnabled");
  const mpesaPreview = {
    payOnDeliveryEnabled,
    mpesaEnabled,
    mpesaBusinessName: form.watch("mpesaBusinessName"),
    tillNumber: form.watch("tillNumber"),
    paybillNumber: form.watch("paybillNumber"),
    mpesaAccountNumber: form.watch("mpesaAccountNumber"),
    mpesaInstructions: form.watch("mpesaInstructions"),
  };
  const mpesaMissingNumbers =
    mpesaEnabled && !(Boolean(tillEnabled && mpesaPreview.tillNumber) || Boolean(paybillEnabled && mpesaPreview.paybillNumber));
  const paymentsPreview = paymentsPreviewLines(mpesaPreview);

  const parseAmount = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (trimmed === "" || !Number.isFinite(Number(trimmed))) return null;
    return Number(trimmed);
  };

  const flatFeeValue = flatFeeEnabled ? parseAmount(flatFeeAmountRaw) : null;
  const freeAboveValue = freeDeliveryEnabled ? parseAmount(freeAboveAmountRaw) : null;
  const currencySymbol = settings?.currencySymbol ?? "KSh";

  const previewLine =
    flatFeeEnabled && flatFeeValue === null
      ? "Delivery: enter a valid flat fee to see the checkout preview."
      : deliveryPreviewLine(flatFeeValue, freeAboveValue, currencySymbol);

  /* -------------------------------- logo -------------------------------- */

  const handleLogoFile = (file: File | null) => {
    if (!file || logoUploading) return;
    if (logoInputRef.current) logoInputRef.current.value = "";

    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      toast.error("Use a JPG, PNG, WebP or AVIF image for the logo.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("That image is larger than 5MB. Please compress it first.");
      return;
    }
    if (!token) {
      toast.error("Your session expired — please sign in again.");
      return;
    }

    setLogoUploading(true);
    uploadImages([file], token)
      .then((result) => {
        const url = result.images[0]?.url;
        if (!url) throw new Error("The upload returned no image.");
        form.setValue("logoUrl", toAbsoluteUrl(url), { shouldDirty: true });
        toast.success("Logo uploaded — remember to save changes");
      })
      .catch((uploadError) => {
        toast.error(
          uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again."
        );
      })
      .finally(() => setLogoUploading(false));
  };

  const handleLogoRemove = () => {
    form.setValue("logoUrl", "", { shouldDirty: true });
  };

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      const saved = await updateSettings.mutateAsync(toSettingsPatch(values));
      form.reset(toFormValues(saved));
      toast.success("Settings saved");
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Could not save settings. Please try again."
      );
    }
  };

  const isSaving = form.formState.isSubmitting || updateSettings.isPending;
  const isDirty = form.formState.isDirty;

  const devPending =
    seedSample.isPending || clearSample.isPending || resetAll.isPending;

  const handleSeed = async () => {
    try {
      const result = await seedSample.mutateAsync();
      const counts = result.counts;
      toast.success("Sample catalogue loaded", {
        description: `${counts.categories ?? 0} categories and ${counts.products ?? 0} clearly-labelled sample products added.`,
      });
    } catch (seedError) {
      toast.error(
        seedError instanceof Error ? seedError.message : "Could not load sample data."
      );
    }
  };

  const handleClearSample = async () => {
    try {
      const result = await clearSample.mutateAsync();
      toast.success(result.message || "Sample data cleared");
    } catch (clearError) {
      toast.error(
        clearError instanceof Error ? clearError.message : "Could not clear sample data."
      );
    }
  };

  const handleReset = async () => {
    try {
      const result = await resetAll.mutateAsync();
      form.reset(EMPTY_FORM_VALUES);
      toast.success(result.message || "Dev store reset — all development data wiped.");
    } catch (resetError) {
      toast.error(
        resetError instanceof Error ? resetError.message : "Could not reset the dev store."
      );
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Settings" />
        <SettingsFormSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Settings" />
        <ErrorState
          title="Settings could not be loaded"
          message={error instanceof Error ? error.message : undefined}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your store profile, contact details and delivery rules — powering the storefront."
      />

      {/* Account — separate form: changing sign-in credentials must never
          submit (or be reset by) the store settings form below. */}
      <div className="mx-auto max-w-4xl space-y-6 pb-6">
        <AccountCard />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="pb-28">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Brand */}
          <Card>
            <CardHeader>
              <CardTitle>Brand</CardTitle>
              <CardDescription>How the shop appears across the storefront.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary/40">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Store logo preview" className="size-full object-contain" />
                  ) : (
                    <span aria-hidden="true" className="font-display text-lg font-semibold text-muted-foreground">
                      MI
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label>Logo</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Shown wherever the shop introduces itself. JPG, PNG, WebP or AVIF — up to 5MB.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={logoUploading || isSaving}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoUploading ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <UploadCloud className="size-4" aria-hidden="true" />
                      )}
                      {logoUploading ? "Uploading…" : "Upload new logo"}
                    </Button>
                    {logoUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        disabled={logoUploading || isSaving}
                        onClick={handleLogoRemove}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(event) => handleLogoFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <Field
                id="settings-name"
                label="Store name"
                error={form.formState.errors.name?.message}
              >
                <Input
                  id="settings-name"
                  autoComplete="organization"
                  aria-invalid={Boolean(form.formState.errors.name)}
                  aria-describedby={describeId("settings-name", form.formState.errors.name?.message)}
                  {...form.register("name")}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="settings-short-name"
                  label="Short name"
                  error={form.formState.errors.shortName?.message}
                  hint='Used where space is tight, e.g. "Mama Israel".'
                >
                  <Input
                    id="settings-short-name"
                    aria-invalid={Boolean(form.formState.errors.shortName)}
                    aria-describedby={describeId("settings-short-name", form.formState.errors.shortName?.message)}
                    {...form.register("shortName")}
                  />
                </Field>
                <Field
                  id="settings-tagline"
                  label="Tagline"
                  error={form.formState.errors.tagline?.message}
                >
                  <Input
                    id="settings-tagline"
                    aria-invalid={Boolean(form.formState.errors.tagline)}
                    aria-describedby={describeId("settings-tagline", form.formState.errors.tagline?.message)}
                    {...form.register("tagline")}
                  />
                </Field>
              </div>
              <Field
                id="settings-description"
                label="Description"
                error={form.formState.errors.description?.message}
                hint="A short paragraph about the shop."
              >
                <Textarea
                  id="settings-description"
                  rows={3}
                  aria-invalid={Boolean(form.formState.errors.description)}
                  aria-describedby={describeId("settings-description", form.formState.errors.description?.message)}
                  {...form.register("description")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* b) Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
              <CardDescription>
                Where customers reach you — shown on the storefront contact page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="settings-email"
                  label="Email"
                  error={form.formState.errors.email?.message}
                >
                  <Input
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={describeId("settings-email", form.formState.errors.email?.message)}
                    {...form.register("email")}
                  />
                </Field>
                <Field
                  id="settings-phone"
                  label="Phone"
                  error={form.formState.errors.phone?.message}
                >
                  <Input
                    id="settings-phone"
                    type="tel"
                    autoComplete="tel"
                    aria-invalid={Boolean(form.formState.errors.phone)}
                    aria-describedby={describeId("settings-phone", form.formState.errors.phone?.message)}
                    {...form.register("phone")}
                  />
                </Field>
              </div>
              <Field
                id="settings-whatsapp"
                label="WhatsApp number"
                error={form.formState.errors.whatsappNumber?.message}
                hint="International digits, e.g. 254712345678. This powers every WhatsApp button on the storefront."
              >
                <Input
                  id="settings-whatsapp"
                  type="tel"
                  inputMode="tel"
                  placeholder="254712345678"
                  aria-invalid={Boolean(form.formState.errors.whatsappNumber)}
                  aria-describedby={describeId("settings-whatsapp", form.formState.errors.whatsappNumber?.message)}
                  {...form.register("whatsappNumber")}
                />
              </Field>
              <Field
                id="settings-location"
                label="Location"
                error={form.formState.errors.location?.message}
              >
                <Input
                  id="settings-location"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(form.formState.errors.location)}
                  aria-describedby={describeId("settings-location", form.formState.errors.location?.message)}
                  {...form.register("location")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* c) Social links */}
          <Card>
            <CardHeader>
              <CardTitle>Social links</CardTitle>
              <CardDescription>
                Rendered as icon links on the contact page when configured. Paste full URLs
                (https://…), or leave them empty.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field
                id="settings-instagram"
                label="Instagram"
                error={form.formState.errors.socialLinks?.instagram?.message}
              >
                <Input
                  id="settings-instagram"
                  placeholder="@mamaisraelcollections"
                  aria-invalid={Boolean(form.formState.errors.socialLinks?.instagram)}
                  aria-describedby={describeId("settings-instagram", form.formState.errors.socialLinks?.instagram?.message)}
                  {...form.register("socialLinks.instagram")}
                />
              </Field>
              <Field
                id="settings-facebook"
                label="Facebook"
                error={form.formState.errors.socialLinks?.facebook?.message}
              >
                <Input
                  id="settings-facebook"
                  aria-invalid={Boolean(form.formState.errors.socialLinks?.facebook)}
                  aria-describedby={describeId("settings-facebook", form.formState.errors.socialLinks?.facebook?.message)}
                  {...form.register("socialLinks.facebook")}
                />
              </Field>
              <Field
                id="settings-tiktok"
                label="TikTok"
                error={form.formState.errors.socialLinks?.tiktok?.message}
              >
                <Input
                  id="settings-tiktok"
                  aria-invalid={Boolean(form.formState.errors.socialLinks?.tiktok)}
                  aria-describedby={describeId("settings-tiktok", form.formState.errors.socialLinks?.tiktok?.message)}
                  {...form.register("socialLinks.tiktok")}
                />
              </Field>
              <Field
                id="settings-twitter"
                label="X (Twitter)"
                error={form.formState.errors.socialLinks?.twitter?.message}
              >
                <Input
                  id="settings-twitter"
                  aria-invalid={Boolean(form.formState.errors.socialLinks?.twitter)}
                  aria-describedby={describeId("settings-twitter", form.formState.errors.socialLinks?.twitter?.message)}
                  {...form.register("socialLinks.twitter")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* d) Delivery */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
              <CardDescription>
                Fees shown at checkout. The server applies these rules to every order.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="settings-flat-fee-switch">Charge a flat delivery fee</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Leave off to confirm the fee with each customer before dispatch.
                  </p>
                </div>
                <Switch
                  id="settings-flat-fee-switch"
                  checked={flatFeeEnabled}
                  onCheckedChange={(checked) =>
                    form.setValue("flatFeeEnabled", checked, { shouldDirty: true })
                  }
                />
              </div>

              {flatFeeEnabled ? (
                <Field
                  id="settings-flat-fee-amount"
                  label={`Flat fee (${currencySymbol})`}
                  error={form.formState.errors.flatFeeAmount?.message}
                >
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      {currencySymbol}
                    </span>
                    <Input
                      id="settings-flat-fee-amount"
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      className="pl-14"
                      aria-invalid={Boolean(form.formState.errors.flatFeeAmount)}
                      aria-describedby={describeId("settings-flat-fee-amount", form.formState.errors.flatFeeAmount?.message)}
                      {...form.register("flatFeeAmount")}
                    />
                  </div>
                </Field>
              ) : null}

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="settings-free-above-switch">Free delivery above a threshold</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Orders whose subtotal reaches this amount deliver free.
                  </p>
                </div>
                <Switch
                  id="settings-free-above-switch"
                  checked={freeDeliveryEnabled}
                  onCheckedChange={(checked) =>
                    form.setValue("freeDeliveryEnabled", checked, { shouldDirty: true })
                  }
                />
              </div>

              {freeDeliveryEnabled ? (
                <Field
                  id="settings-free-above-amount"
                  label={`Free delivery above (${currencySymbol})`}
                  error={form.formState.errors.freeAboveAmount?.message}
                >
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                    >
                      {currencySymbol}
                    </span>
                    <Input
                      id="settings-free-above-amount"
                      type="number"
                      min={0}
                      step="any"
                      inputMode="decimal"
                      className="pl-14"
                      aria-invalid={Boolean(form.formState.errors.freeAboveAmount)}
                      aria-describedby={describeId("settings-free-above-amount", form.formState.errors.freeAboveAmount?.message)}
                      {...form.register("freeAboveAmount")}
                    />
                  </div>
                </Field>
              ) : null}

              {/* Delivery zones — matched by name before the flat fee applies */}
              <div className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Delivery zones</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Customers who type a zone name pay that fee. Zones match by name —
                      unmatched locations use the flat fee (or confirm manually).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isSaving || zonesArray.fields.length >= 20}
                    onClick={() =>
                      zonesArray.append({ id: newZoneId(), name: "", fee: "" })
                    }
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Add zone
                  </Button>
                </div>

                {zonesArray.fields.length > 0 ? (
                  <ul className="space-y-2" aria-label="Delivery zones">
                    {zonesArray.fields.map((field, index) => {
                      const nameError =
                        form.formState.errors.deliveryZones?.[index]?.name?.message;
                      const feeError =
                        form.formState.errors.deliveryZones?.[index]?.fee?.message;
                      return (
                        <li
                          key={field.id}
                          className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border border-border bg-background/40 p-3"
                        >
                          <div className="space-y-1">
                            <Label htmlFor={`zone-name-${field.id}`} className="sr-only">
                              Zone name
                            </Label>
                            <Input
                              id={`zone-name-${field.id}`}
                              placeholder="Zone name, e.g. Nairobi Westlands"
                              aria-invalid={Boolean(nameError)}
                              aria-describedby={
                                nameError ? `zone-name-error-${field.id}` : undefined
                              }
                              {...form.register(`deliveryZones.${index}.name`)}
                            />
                            {nameError ? (
                              <p
                                id={`zone-name-error-${field.id}`}
                                role="alert"
                                className="text-xs text-destructive"
                              >
                                {nameError}
                              </p>
                            ) : null}
                          </div>
                          <div className="col-start-2 row-span-2 flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1">
                              <div className="relative w-36">
                                <span
                                  aria-hidden="true"
                                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                                >
                                  {currencySymbol}
                                </span>
                                <Input
                                  id={`zone-fee-${field.id}`}
                                  type="number"
                                  min={0}
                                  step="any"
                                  inputMode="decimal"
                                  placeholder="0"
                                  className="pl-14"
                                  aria-invalid={Boolean(feeError)}
                                  aria-describedby={
                                    feeError ? `zone-fee-error-${field.id}` : undefined
                                  }
                                  {...form.register(`deliveryZones.${index}.fee`)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label={`Remove zone ${index + 1}`}
                                disabled={isSaving}
                                onClick={() => zonesArray.remove(index)}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                            {feeError ? (
                              <p
                                id={`zone-fee-error-${field.id}`}
                                role="alert"
                                className="text-right text-xs text-destructive"
                              >
                                {feeError}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    No zones yet — every delivery fee is confirmed manually, or via the flat
                    fee above.
                  </p>
                )}
              </div>

              <Field
                id="settings-delivery-note"
                label="Delivery note"
                error={form.formState.errors.deliveryNote?.message}
                hint="Shown at checkout — e.g. rural-area surcharges or same-day cut-off times."
              >
                <Textarea
                  id="settings-delivery-note"
                  rows={2}
                  aria-invalid={Boolean(form.formState.errors.deliveryNote)}
                  aria-describedby={describeId("settings-delivery-note", form.formState.errors.deliveryNote?.message)}
                  {...form.register("deliveryNote")}
                />
              </Field>

              {/* Live checkout preview */}
              <div className="rounded-lg border border-dashed border-gold/50 bg-gold-soft/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Checkout preview
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">{previewLine}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Zones match by name — unmatched locations use the flat fee (or confirm
                  manually).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* e) Payments */}
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
              <CardDescription>
                How customers can pay. Disabled methods are never shown at checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="settings-pay-on-delivery-switch">Pay on delivery enabled</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Customers pay cash when their order arrives.
                  </p>
                </div>
                <Switch
                  id="settings-pay-on-delivery-switch"
                  checked={payOnDeliveryEnabled}
                  onCheckedChange={(checked) =>
                    form.setValue("payOnDeliveryEnabled", checked, { shouldDirty: true })
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="settings-mpesa-switch">Enable M-Pesa payments</Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Customers pay via Lipa na M-Pesa and submit the transaction code; you verify
                    it against your own M-Pesa records. The website never charges anyone.
                  </p>
                </div>
                <Switch
                  id="settings-mpesa-switch"
                  checked={mpesaEnabled}
                  onCheckedChange={(checked) =>
                    form.setValue("mpesaEnabled", checked, { shouldDirty: true })
                  }
                />
              </div>

              {mpesaEnabled ? (
                <div className="space-y-4 rounded-lg border border-border bg-background/40 p-4">
                  <Field
                    id="settings-mpesa-business-name"
                    label="Business name"
                    error={form.formState.errors.mpesaBusinessName?.message}
                    hint="Shown on the checkout instructions. Leave empty to use the store name."
                  >
                    <Input
                      id="settings-mpesa-business-name"
                      placeholder="e.g. Mama Israel Collections"
                      aria-invalid={Boolean(form.formState.errors.mpesaBusinessName)}
                      aria-describedby={describeId(
                        "settings-mpesa-business-name",
                        form.formState.errors.mpesaBusinessName?.message
                      )}
                      {...form.register("mpesaBusinessName")}
                    />
                  </Field>

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="settings-mpesa-till-switch">M-Pesa Till</Label>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Customers pay to your Buy Goods and Services till.
                      </p>
                    </div>
                    <Switch
                      id="settings-mpesa-till-switch"
                      checked={tillEnabled}
                      onCheckedChange={(checked) =>
                        form.setValue("tillEnabled", checked, { shouldDirty: true })
                      }
                    />
                  </div>

                  {tillEnabled ? (
                    <Field
                      id="settings-mpesa-till-number"
                      label="Till number"
                      error={form.formState.errors.tillNumber?.message}
                    >
                      <Input
                        id="settings-mpesa-till-number"
                        inputMode="numeric"
                        placeholder="e.g. 123456"
                        className="sm:w-56"
                        aria-invalid={Boolean(form.formState.errors.tillNumber)}
                        aria-describedby={describeId(
                          "settings-mpesa-till-number",
                          form.formState.errors.tillNumber?.message
                        )}
                        {...form.register("tillNumber")}
                      />
                    </Field>
                  ) : null}

                  <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5">
                    <div className="space-y-0.5">
                      <Label htmlFor="settings-mpesa-paybill-switch">M-Pesa Paybill</Label>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Customers pay to your Pay Bill business number.
                      </p>
                    </div>
                    <Switch
                      id="settings-mpesa-paybill-switch"
                      checked={paybillEnabled}
                      onCheckedChange={(checked) =>
                        form.setValue("paybillEnabled", checked, { shouldDirty: true })
                      }
                    />
                  </div>

                  {paybillEnabled ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        id="settings-mpesa-paybill-number"
                        label="Paybill number"
                        error={form.formState.errors.paybillNumber?.message}
                      >
                        <Input
                          id="settings-mpesa-paybill-number"
                          inputMode="numeric"
                          placeholder="e.g. 4123456"
                          aria-invalid={Boolean(form.formState.errors.paybillNumber)}
                          aria-describedby={describeId(
                            "settings-mpesa-paybill-number",
                            form.formState.errors.paybillNumber?.message
                          )}
                          {...form.register("paybillNumber")}
                        />
                      </Field>
                      <Field
                        id="settings-mpesa-account-number"
                        label="Account number / name"
                        error={form.formState.errors.mpesaAccountNumber?.message}
                        hint="Customers enter this as the account when paying via Paybill."
                      >
                        <Input
                          id="settings-mpesa-account-number"
                          placeholder="e.g. Orders or the customer name"
                          aria-invalid={Boolean(form.formState.errors.mpesaAccountNumber)}
                          aria-describedby={describeId(
                            "settings-mpesa-account-number",
                            form.formState.errors.mpesaAccountNumber?.message
                          )}
                          {...form.register("mpesaAccountNumber")}
                        />
                      </Field>
                    </div>
                  ) : null}

                  {mpesaMissingNumbers ? (
                    <p
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900"
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      M-Pesa is enabled but neither a Till number nor a Paybill number has been
                      entered — customers cannot pay yet. Add at least one number and save.
                    </p>
                  ) : null}

                  <Field
                    id="settings-mpesa-instructions"
                    label="Payment instructions"
                    error={form.formState.errors.mpesaInstructions?.message}
                    hint="Shown to customers at checkout. Leave empty and clear numbered steps are generated automatically."
                  >
                    <Textarea
                      id="settings-mpesa-instructions"
                      rows={4}
                      placeholder={"e.g. Pay using the number the order was placed with.\nWe confirm payments within a few minutes during working hours."}
                      aria-invalid={Boolean(form.formState.errors.mpesaInstructions)}
                      aria-describedby={describeId(
                        "settings-mpesa-instructions",
                        form.formState.errors.mpesaInstructions?.message
                      )}
                      {...form.register("mpesaInstructions")}
                    />
                  </Field>
                </div>
              ) : null}

              {/* Live customer checkout preview */}
              <div className="rounded-lg border border-dashed border-gold/50 bg-gold-soft/30 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Customer checkout preview
                </p>
                <ul className="mt-2 space-y-1.5">
                  {paymentsPreview.map((line) => (
                    <li key={line} className="text-sm font-medium text-foreground">
                      {line}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Customers pick one method at checkout — availability comes from these switches.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* f) Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>When products get flagged as low stock.</CardDescription>
            </CardHeader>
            <CardContent>
              <Field
                id="settings-low-stock"
                label="Low stock threshold"
                error={form.formState.errors.lowStockThreshold?.message}
                hint="Products at or below this quantity show a low-stock notice on the storefront."
              >
                <Input
                  id="settings-low-stock"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="sm:w-40"
                  aria-invalid={Boolean(form.formState.errors.lowStockThreshold)}
                  aria-describedby={describeId("settings-low-stock", form.formState.errors.lowStockThreshold?.message)}
                  {...form.register("lowStockThreshold")}
                />
              </Field>
            </CardContent>
          </Card>

          {/* Sticky save bar — appears only when there is something to save */}
          {isDirty ? (
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div
                className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between lg:px-8"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
              >
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span aria-hidden="true" className="size-2 rounded-full bg-gold" />
                  Unsaved changes
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSaving}
                    onClick={() => {
                      if (settings) form.reset(toFormValues(settings));
                    }}
                  >
                    Discard
                  </Button>
                  <Button type="submit" className="gap-2 rounded-full" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="size-4" aria-hidden="true" />
                    )}
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </form>

      <div className="mx-auto max-w-4xl space-y-6 pb-10">
        {/* Production readiness — the owner's honest configuration checklist */}
        <ProductionCheckCard />

        {/* Development data — danger zone. Dev-store only; hidden while the
            production backend is connected (it returns 410 in that mode). */}
        {!backendMode && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Development data
              <Badge variant="destructive">Danger zone</Badge>
            </CardTitle>
            <CardDescription>
              The Phase 1 store runs on an in-memory development adapter. Sample data is
              never loaded automatically — fixtures are opt-in, visibly prefixed with
              “Sample:”, and wiped whenever the dev server restarts.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2"
                  disabled={devPending}
                >
                  {seedSample.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <FlaskConical className="size-4" aria-hidden="true" />
                  )}
                  Load sample catalogue
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Load the sample catalogue?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Adds clearly-labelled sample categories and products so you can
                    preview every page. Nothing happens automatically — you can clear
                    the sample data at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleSeed()}>
                    Load sample data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={devPending}
              onClick={() => void handleClearSample()}
            >
              {clearSample.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Clear sample data
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2 sm:ml-auto"
                  disabled={devPending}
                >
                  {resetAll.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RotateCcw className="size-4" aria-hidden="true" />
                  )}
                  Reset store (wipe all dev data)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset the entire dev store?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently wipes ALL development data — the sample catalogue,
                    test orders, customers and any settings changes — restoring the
                    empty store. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive"
                    onClick={() => void handleReset()}
                  >
                    Yes, wipe everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
        )}

        {/* Honest note */}
        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>What powers the storefront</AlertTitle>
          <AlertDescription>
            Store details, delivery rules and payment instructions saved here power the
            storefront immediately.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
