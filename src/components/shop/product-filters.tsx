"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Category, ProductColor } from "@/types";

interface ProductFiltersProps {
  /** Unique prefix so rail + sheet input ids never collide */
  idPrefix: string;
  categories?: Category[];
  categoriesLoading: boolean;
  activeCategorySlug: string | null;
  onCategoryChange: (slug: string | null) => void;
  priceMin: number | null;
  priceMax: number | null;
  onPriceChange: (min: number | null, max: number | null) => void;
  availableSizes: string[];
  selectedSizes: string[];
  onToggleSize: (size: string) => void;
  availableColors: ProductColor[];
  selectedColors: string[];
  onToggleColor: (name: string) => void;
  inStockOnly: boolean;
  onInStockChange: (checked: boolean) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

function parsePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed);
}

function sectionTitle(children: React.ReactNode) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

/**
 * Filter panel shared by the desktop rail and the mobile sheet:
 * category radio list, price inputs, size chips, colour swatches, stock toggle.
 */
export function ProductFilters({
  idPrefix,
  categories,
  categoriesLoading,
  activeCategorySlug,
  onCategoryChange,
  priceMin,
  priceMax,
  onPriceChange,
  availableSizes,
  selectedSizes,
  onToggleSize,
  availableColors,
  selectedColors,
  onToggleColor,
  inStockOnly,
  onInStockChange,
  hasActiveFilters,
  onClearAll,
}: ProductFiltersProps) {
  // Price drafts commit on blur / Enter — never on every keystroke.
  // Drafts re-sync when the committed value changes elsewhere (chips, clear all)
  // using the render-time state adjustment pattern (no effects).
  const [minDraft, setMinDraft] = useState(priceMin !== null ? String(priceMin) : "");
  const [maxDraft, setMaxDraft] = useState(priceMax !== null ? String(priceMax) : "");
  const [lastPriceMin, setLastPriceMin] = useState(priceMin);
  const [lastPriceMax, setLastPriceMax] = useState(priceMax);

  if (lastPriceMin !== priceMin) {
    setLastPriceMin(priceMin);
    setMinDraft(priceMin !== null ? String(priceMin) : "");
  }
  if (lastPriceMax !== priceMax) {
    setLastPriceMax(priceMax);
    setMaxDraft(priceMax !== null ? String(priceMax) : "");
  }

  const handlePriceCommit = () => {
    let min = parsePrice(minDraft);
    let max = parsePrice(maxDraft);
    if (min !== null && max !== null && min > max) {
      [min, max] = [max, min];
    }
    onPriceChange(min, max);
  };

  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handlePriceCommit();
      event.currentTarget.blur();
    }
  };

  const categoryRow =
    "flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary/70 has-[[data-state=checked]]:bg-secondary has-[[data-state=checked]]:font-medium has-[[data-state=checked]]:text-primary";

  return (
    <div>
      {hasActiveFilters ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {/* Category */}
      <fieldset>
        <legend>{sectionTitle("Category")}</legend>
        {categoriesLoading ? (
          <div className="mt-2.5 space-y-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            No categories yet — every piece is listed below.
          </p>
        ) : (
          <RadioGroup
            value={activeCategorySlug ?? ""}
            onValueChange={(value) => onCategoryChange(value || null)}
            className="mt-2.5 space-y-1"
          >
            <label htmlFor={`${idPrefix}-category-all`} className={categoryRow}>
              <span className="flex items-center gap-2.5">
                <RadioGroupItem value="" id={`${idPrefix}-category-all`} />
                All pieces
              </span>
            </label>
            {categories.map((category) => (
              <label
                key={category.id}
                htmlFor={`${idPrefix}-category-${category.id}`}
                className={categoryRow}
              >
                <span className="flex items-center gap-2.5">
                  <RadioGroupItem value={category.slug} id={`${idPrefix}-category-${category.id}`} />
                  {category.name}
                </span>
                {typeof category.productCount === "number" ? (
                  <Badge
                    variant="secondary"
                    className="bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {category.productCount}
                  </Badge>
                ) : null}
              </label>
            ))}
          </RadioGroup>
        )}
      </fieldset>

      <Separator className="my-5" />

      {/* Price */}
      <fieldset>
        <legend>{sectionTitle("Price")}</legend>
        <div className="mt-2.5 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Label htmlFor={`${idPrefix}-price-min`} className="text-xs text-muted-foreground">
              Min (KSh)
            </Label>
            <Input
              id={`${idPrefix}-price-min`}
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              placeholder="0"
              value={minDraft}
              onChange={(e) => setMinDraft(e.target.value)}
              onBlur={handlePriceCommit}
              onKeyDown={commitOnEnter}
              className="mt-1 h-9"
            />
          </div>
          <span className="pb-2.5 text-muted-foreground" aria-hidden="true">
            –
          </span>
          <div className="min-w-0 flex-1">
            <Label htmlFor={`${idPrefix}-price-max`} className="text-xs text-muted-foreground">
              Max (KSh)
            </Label>
            <Input
              id={`${idPrefix}-price-max`}
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              placeholder="Any"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              onBlur={handlePriceCommit}
              onKeyDown={commitOnEnter}
              className="mt-1 h-9"
            />
          </div>
        </div>
      </fieldset>

      <Separator className="my-5" />

      {/* Size */}
      <fieldset>
        <legend>{sectionTitle("Size")}</legend>
        {availableSizes.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">No size information yet.</p>
        ) : (
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Filter by size">
            {availableSizes.map((size) => {
              const selected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleSize(size)}
                  className={cn(
                    "min-w-10 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>

      {availableColors.length > 0 ? (
        <>
          <Separator className="my-5" />
          <fieldset>
            <legend>{sectionTitle("Colour")}</legend>
            <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Filter by colour">
              {availableColors.map((color) => {
                const selected = selectedColors.includes(color.name);
                return (
                  <button
                    key={color.name}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onToggleColor(color.name)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      selected
                        ? "border-primary bg-secondary font-medium text-foreground"
                        : "border-input bg-background text-foreground/85 hover:border-primary/50"
                    )}
                  >
                    <span
                      className="size-4 rounded-full border border-border shadow-inner"
                      style={{ backgroundColor: color.hex }}
                      aria-hidden="true"
                    />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </>
      ) : null}

      <Separator className="my-5" />

      {/* Availability */}
      <fieldset>
        <legend className="sr-only">Availability</legend>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id={`${idPrefix}-in-stock`}
            checked={inStockOnly}
            onCheckedChange={(checked) => onInStockChange(checked === true)}
          />
          <Label
            htmlFor={`${idPrefix}-in-stock`}
            className="cursor-pointer text-sm font-normal text-foreground"
          >
            In stock only
          </Label>
        </div>
      </fieldset>
    </div>
  );
}
