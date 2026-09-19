"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/admin/products/image-uploader";
import { useAdminCategoryMutations, useAdminProductMutations } from "@/hooks/admin/use-admin-data";
import { ApiError } from "@/services/api/client";
import { formatPrice } from "@/lib/format";
import { colorWithHex } from "@/lib/color-names";
import type { AiProductDraft } from "@/types";
import type { ProductFormImage } from "@/components/admin/products/product-form-schema";

/**
 * One AI-proposed product draft: preview first (never auto-published),
 * full editing, category resolution, publish or save as inactive draft.
 * Publishing uses the SAME admin products API as the manual form.
 */

const MISSING_LABELS: Record<string, string> = {
  name: "name",
  description: "description",
  price: "price",
  category: "category",
  stock: "stock quantity",
};

interface AiDraftCardProps {
  draft: AiProductDraft;
  categories: Array<{ id: string; name: string }>;
  onChange: (draftId: string, patch: Partial<AiProductDraft>) => void;
  onRemove: (draftId: string) => void;
  onSettled: (draftId: string, active: boolean, productName: string, slug: string) => void;
}

function draftProblems(draft: AiProductDraft): string[] {
  const problems: string[] = [];
  if (draft.name.trim().length < 2) problems.push("a product name");
  if (draft.description.trim().length < 10) problems.push("a description (at least 10 characters)");
  if (draft.price === null || draft.price <= 0) problems.push("a price");
  if (!draft.categoryId) problems.push("a category");
  if (draft.stockQuantity === null || draft.stockQuantity < 0) problems.push("a stock quantity");
  return problems;
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function AiDraftCard({
  draft,
  categories,
  onChange,
  onRemove,
  onSettled,
}: AiDraftCardProps) {
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const { create } = useAdminProductMutations();
  const { create: createCategory } = useAdminCategoryMutations();
  const publishing = create.isPending;

  const markDirty = () => {
    setDirty(true);
  };

  const patch = (next: Partial<AiProductDraft>) => {
    markDirty();
    onChange(draft.draftId, next);
  };

  const problems = useMemo(() => draftProblems(draft), [draft]);
  const selectedCategory = categories.find((c) => c.id === draft.categoryId);

  const images: ProductFormImage[] = draft.imageUrls.map((url, i) => ({
    url,
    alt: draft.name,
    isPrimary: i === 0,
    sortOrder: i,
  }));

  const buildInput = (isActive: boolean) => ({
    name: draft.name.trim(),
    description: draft.description.trim(),
    categoryId: draft.categoryId!,
    price: draft.price!,
    compareAtPrice: draft.compareAtPrice ?? null,
    images: draft.imageUrls.map((url, i) => ({
      url,
      alt: draft.name.trim(),
      isPrimary: i === 0,
      sortOrder: i,
    })),
    sizes: draft.sizes,
    colors: draft.colors,
    stockQuantity: draft.stockQuantity!,
    isFeatured: draft.isFeatured,
    isNewArrival: draft.isNewArrival,
    isActive,
  });

  const handleSave = async (isActive: boolean) => {
    try {
      const product = await create.mutateAsync(buildInput(isActive));
      toast.success(
        isActive
          ? `"${product.name}" is live in your shop.`
          : `"${product.name}" saved as an inactive draft — find it in Products.`
      );
      onSettled(draft.draftId, isActive, product.name, product.slug);
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";
      toast.error(message);
    }
  };

  const handleCreateCategory = async () => {
    const name = (newCategoryName.trim() || draft.requestedCategory?.trim() || "").slice(0, 60);
    if (name.length < 2) {
      toast.error("Type a category name first (at least 2 characters).");
      return;
    }
    setCreatingCategory(true);
    try {
      const category = await createCategory.mutateAsync({ name });
      toast.success(`Category "${category.name}" created.`);
      patch({ categoryId: category.id, categoryMatched: true });
      setNewCategoryName("");
    } catch (error) {
      const message =
        error instanceof ApiError || error instanceof Error
          ? error.message
          : "Could not create the category.";
      toast.error(message);
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* ------------------------------ header ------------------------------ */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Product preview
            </p>
            <h3 className="mt-0.5 truncate font-display text-lg font-bold text-foreground">
              {draft.name.trim() || "Untitled product"}
            </h3>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-full"
            onClick={() => setEditing((v) => !v)}
            aria-expanded={editing}
          >
            {editing ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <Pencil className="size-4" aria-hidden="true" />}
            {editing ? "Done editing" : "Edit product"}
          </Button>
        </div>

        {/* ---------------------------- preview grid ---------------------------- */}
        <div className="grid gap-5 sm:grid-cols-[auto,1fr]">
          {/* Images */}
          <div className="flex gap-2 sm:flex-col">
            {draft.imageUrls.length > 0 ? (
              draft.imageUrls.slice(0, 4).map((url, i) => (
                <div
                  key={url}
                  className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/40 sm:size-24"
                >
                  <Image
                    src={url}
                    alt={`${draft.name || "Product"} photo ${i + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
              ))
            ) : (
              <div className="flex size-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 text-[10px] text-muted-foreground sm:size-24">
                No photo
              </div>
            )}
          </div>

          <dl className="min-w-0 space-y-2.5 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Category
              </dt>
              <dd className={draft.categoryId ? "text-foreground" : "font-medium text-amber-700"}>
                {selectedCategory ? selectedCategory.name : draft.requestedCategory || "Not set"}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Price
              </dt>
              <dd className="flex items-baseline gap-2">
                {draft.price !== null ? (
                  <span className="font-semibold text-foreground">{formatPrice(draft.price)}</span>
                ) : (
                  <span className="font-medium text-amber-700">Not set</span>
                )}
                {draft.compareAtPrice !== null ? (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(draft.compareAtPrice)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sizes
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {draft.sizes.length > 0 ? (
                  draft.sizes.map((size) => (
                    <span
                      key={size}
                      className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium"
                    >
                      {size}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">none</span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Colours
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {draft.colors.length > 0 ? (
                  draft.colors.map((color) => (
                    <span
                      key={`${color.name}-${color.hex}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium"
                    >
                      <span
                        aria-hidden="true"
                        className="size-2.5 rounded-full border border-border"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">none</span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stock
              </dt>
              <dd>
                {draft.stockQuantity !== null ? (
                  <span className="text-foreground">
                    {draft.stockQuantity > 0
                      ? `In stock — ${draft.stockQuantity} available`
                      : "Out of stock (0)"}
                  </span>
                ) : (
                  <span className="font-medium text-amber-700">Not set</span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Badges
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {draft.isNewArrival ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">New arrival</span>
                ) : null}
                {draft.isFeatured ? (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-foreground">
                    Featured
                  </span>
                ) : null}
                {!draft.isNewArrival && !draft.isFeatured ? (
                  <span className="text-xs italic text-muted-foreground">none</span>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </dt>
              <dd className={draft.description.trim() ? "leading-relaxed text-foreground" : "font-medium text-amber-700"}>
                {draft.description.trim() || "Not set"}
              </dd>
            </div>
          </dl>
        </div>

        {/* ------------------------ category not found ------------------------ */}
        {!draft.categoryId ? (
          <Alert className="border-amber-300/70 bg-amber-50 text-amber-900">
            <AlertTriangle className="size-4 !text-amber-600" aria-hidden="true" />
            <AlertTitle>Category not found</AlertTitle>
            <AlertDescription className="text-amber-800">
              {draft.requestedCategory ? (
                <>
                  &ldquo;{draft.requestedCategory}&rdquo; isn&apos;t currently available. Create it below or
                  choose an existing category.
                </>
              ) : (
                "I couldn't determine the category. Please choose one below."
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={draft.requestedCategory || "New category name"}
                    aria-label="New category name"
                    className="h-9 border-amber-300 bg-white/70"
                    maxLength={60}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 gap-1 rounded-full"
                    disabled={creatingCategory || publishing}
                    onClick={() => void handleCreateCategory()}
                  >
                    {creatingCategory ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Plus className="size-4" aria-hidden="true" />
                    )}
                    Create category
                  </Button>
                </div>
                <Select
                  value={draft.categoryId ?? ""}
                  onValueChange={(value) => patch({ categoryId: value, categoryMatched: true })}
                >
                  <SelectTrigger className="h-9 w-full border-amber-300 bg-white/70 sm:w-52" aria-label="Choose existing category">
                    <SelectValue placeholder="Choose existing category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </AlertDescription>
          </Alert>
        ) : null}

        {/* ------------------------------ edit mode ------------------------------ */}
        {editing ? (
          <div className="space-y-4 rounded-xl border border-border bg-secondary/30 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${draft.draftId}`}>Name</Label>
                <Input
                  id={`name-${draft.draftId}`}
                  value={draft.name}
                  maxLength={120}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`category-${draft.draftId}`}>Category</Label>
                <Select
                  value={draft.categoryId ?? ""}
                  onValueChange={(value) => patch({ categoryId: value, categoryMatched: true })}
                >
                  <SelectTrigger id={`category-${draft.draftId}`} aria-label="Category">
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`price-${draft.draftId}`}>Price (KSh)</Label>
                <Input
                  id={`price-${draft.draftId}`}
                  type="number"
                  min={1}
                  step="1"
                  inputMode="numeric"
                  value={draft.price ?? ""}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value);
                    patch({ price: Number.isFinite(value) && value > 0 ? value : null });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`compare-${draft.draftId}`} className="flex items-center gap-1">
                  Sale price (was)
                  <span className="text-xs font-normal text-muted-foreground">optional</span>
                </Label>
                <Input
                  id={`compare-${draft.draftId}`}
                  type="number"
                  min={1}
                  step="1"
                  inputMode="numeric"
                  value={draft.compareAtPrice ?? ""}
                  onChange={(e) => {
                    const value = Number.parseFloat(e.target.value);
                    patch({ compareAtPrice: Number.isFinite(value) && value > 0 ? value : null });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`sizes-${draft.draftId}`}>Sizes (comma separated)</Label>
                <Input
                  id={`sizes-${draft.draftId}`}
                  value={draft.sizes.join(", ")}
                  placeholder="S, M, L, XL"
                  onChange={(e) => patch({ sizes: parseList(e.target.value).map((s) => s.toUpperCase()) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`colors-${draft.draftId}`}>Colours (comma separated)</Label>
                <Input
                  id={`colors-${draft.draftId}`}
                  value={draft.colors.map((c) => c.name).join(", ")}
                  placeholder="Black, Red"
                  onChange={(e) => patch({ colors: parseList(e.target.value).map(colorWithHex) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`stock-${draft.draftId}`}>Stock quantity</Label>
                <Input
                  id={`stock-${draft.draftId}`}
                  type="number"
                  min={0}
                  step="1"
                  inputMode="numeric"
                  value={draft.stockQuantity ?? ""}
                  onChange={(e) => {
                    const value = Number.parseInt(e.target.value, 10);
                    patch({ stockQuantity: Number.isFinite(value) && value >= 0 ? value : null });
                  }}
                />
              </div>
              <div className="flex items-end gap-6 pb-1">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={draft.isNewArrival}
                    onCheckedChange={(checked) => patch({ isNewArrival: checked })}
                    aria-label="New arrival"
                  />
                  New arrival
                </label>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={draft.isFeatured}
                    onCheckedChange={(checked) => patch({ isFeatured: checked })}
                    aria-label="Featured"
                  />
                  Featured
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`description-${draft.draftId}`}>Description</Label>
              <Textarea
                id={`description-${draft.draftId}`}
                value={draft.description}
                rows={3}
                maxLength={5000}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Photos</Label>
              <ImageUploader
                value={images}
                disabled={publishing}
                onChange={(next) =>
                  patch({ imageUrls: next.map((img) => img.url) })
                }
              />
            </div>
          </div>
        ) : null}

        {/* ------------------------------ actions ------------------------------ */}
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          {problems.length > 0 ? (
            <p className="text-xs text-amber-700" role="status">
              Still needed before publishing: {problems.join(", ")}.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="flex-1 gap-2 rounded-full"
              disabled={problems.length > 0 || publishing}
              onClick={() => void handleSave(true)}
            >
              {publishing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Publish Product
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-full"
              disabled={problems.length > 0 || publishing}
              onClick={() => void handleSave(false)}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-destructive sm:size-9"
              aria-label="Discard this draft"
              disabled={publishing}
              onClick={() => onRemove(draft.draftId)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {dirty ? (
            <p className="text-[11px] text-muted-foreground">
              Your edits are kept — the assistant won&apos;t overwrite them unless you run it again.
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
