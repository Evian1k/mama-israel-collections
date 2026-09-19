"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminCategoryMutations } from "@/hooks/admin/use-admin-data";
import { ApiError } from "@/services/api/client";
import type { Category, CreateCategoryInput } from "@/types";

/**
 * Client-side mirror of the server's `categoryInputSchema`
 * (src/server/validation.ts) — the API stays the authority.
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(60),
  slug: z
    .string()
    .trim()
    .max(80, "Slug is too long")
    .regex(SLUG_REGEX, "Slug may only contain lowercase letters, numbers and hyphens")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long (max 500 characters)")
    .optional()
    .transform((v) => (v ? v : undefined)),
  imageUrl: z
    .string()
    .trim()
    .max(500, "Image URL is too long")
    .optional()
    .transform((v) => (v ? v : undefined)),
  isActive: z.boolean(),
  sortOrder: z
    .string()
    .trim()
    .min(1, "Enter a sort order")
    .refine((v) => /^\d{1,4}$/.test(v), "Must be a whole number between 0 and 9999"),
});

/** Bound to the inputs (optional keys) — matches the resolver's expected shape */
type CategoryFormInput = z.input<typeof categoryFormSchema>;

/** Matches the dev-store slugify logic */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildDefaults(initial?: Category | null): CategoryFormInput {
  return {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    imageUrl: initial?.imageUrl ?? "",
    isActive: initial?.isActive ?? true,
    sortOrder: String(initial?.sortOrder ?? 0),
  };
}

interface CategoryDialogFormProps {
  mode: "create" | "edit";
  initial?: Category | null;
  onFinished: () => void;
}

/**
 * Create / edit form for a category, rendered inside the dialog.
 * Remounted (keyed by the parent) whenever the target changes so RHF
 * defaultValues re-initialise without effects.
 */
export function CategoryDialogForm({ mode, initial, onFinished }: CategoryDialogFormProps) {
  const { create, update } = useAdminCategoryMutations();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    mode: "onTouched",
    defaultValues: buildDefaults(initial),
  });

  const nameValue = form.watch("name") ?? "";
  const descriptionValue = form.watch("description") ?? "";
  const pending = create.isPending || update.isPending;
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(
    (values: CategoryFormInput) => {
      setSubmitError(null);
      const payload: CreateCategoryInput = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        imageUrl: values.imageUrl ?? null,
        isActive: values.isActive,
        sortOrder: Number(values.sortOrder),
      };

      const request =
        mode === "create"
          ? create.mutateAsync(payload)
          : update.mutateAsync({ id: initial!.id, input: payload });

      request
        .then(() => {
          toast.success(mode === "create" ? "Category created" : "Category updated");
          onFinished();
        })
        .catch((error: unknown) => {
          const message =
            error instanceof ApiError && error.message
              ? error.message
              : "We could not save this category. Please try again.";
          setSubmitError(message);
          toast.error(message);
        });
    },
    () => {
      setSubmitError("Please fix the highlighted fields before saving.");
    }
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {submitError ? (
          <Alert variant="destructive" role="alert">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>We could not save this category</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Dresses"
                  autoComplete="off"
                  value={field.value}
                  onChange={(event) => {
                    field.onChange(event.target.value);
                    if (!slugTouched) {
                      form.setValue("slug", slugify(event.target.value));
                    }
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>
                Shop URL:{" "}
                <span className="font-mono">
                  /shop/{slugTouched ? form.watch("slug") || slugify(nameValue) : slugify(nameValue) || "…"}
                </span>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  value={field.value ?? ""}
                  placeholder="auto-generated-from-name"
                  autoComplete="off"
                  className="font-mono text-xs"
                  onChange={(event) => {
                    setSlugTouched(true);
                    field.onChange(event.target.value);
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>Description (optional)</FormLabel>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {(field.value ?? "").length}/500
                </span>
              </div>
              <FormControl>
                <Textarea
                  rows={3}
                  maxLength={500}
                  placeholder="A line or two about this collection."
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="/images/… or https://…"
                  autoComplete="off"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value)}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              </FormControl>
              <FormDescription>
                Shown on the collection card. Paste a URL for now — uploads move to cloud
                storage in Phase 2.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="sortOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sort order</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    name={field.name}
                  />
                </FormControl>
                <FormDescription>Lower numbers appear first.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-3 rounded-lg border border-border p-3 sm:mt-0">
                <div className="space-y-0.5">
                  <FormLabel className="font-medium">Active</FormLabel>
                  <FormDescription>Visible in the store.</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Category is active"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onFinished} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" className="min-w-32 rounded-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {mode === "create" ? "Create category" : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
