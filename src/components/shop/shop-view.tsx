"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProductGrid, ProductGridSkeleton } from "@/components/shared/product-grid";
import { useCategories } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { formatNumber } from "@/lib/format";
import type { ProductColor, ProductQuery, ProductSort } from "@/types";
import { ProductFilters } from "./product-filters";
import { FilterChips, type ActiveFilterChip } from "./filter-chips";

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "featured", label: "Featured first" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name A–Z" },
];

const FALLBACK_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SEARCH_DEBOUNCE_MS = 300;

function listParam(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numParam(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function humaniseSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

type FilterUpdates = Record<string, string | null>;

/**
 * The shop — URL-driven filtering over an infinite product grid.
 * Every filter lives in the query string, so any view is shareable.
 */
export function ShopView({ initialCategorySlug }: { initialCategorySlug?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* ------------------------------- filter state ------------------------------- */
  const q = searchParams.get("q") ?? "";
  const sortParam = (searchParams.get("sort") ?? "featured") as ProductSort;
  const categoryParam = searchParams.get("category");
  const activeCategorySlug = categoryParam ?? initialCategorySlug ?? null;
  const minPrice = numParam(searchParams.get("min"));
  const maxPrice = numParam(searchParams.get("max"));
  const selectedSizes = useMemo(() => listParam(searchParams.get("sizes")), [searchParams]);
  const selectedColors = useMemo(() => listParam(searchParams.get("colors")), [searchParams]);
  const inStockOnly = searchParams.get("stock") === "1";

  /* ------------------------------ URL navigation ------------------------------ */
  const commitFilters = useCallback(
    (updates: FilterUpdates) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      const base = initialCategorySlug ? `/shop/${initialCategorySlug}` : "/shop";
      router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
    },
    [searchParams, initialCategorySlug, router]
  );

  // Category lives in the path on /shop/[category] and in the query on /shop
  const commitCategory = useCallback(
    (slug: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      const qs = params.toString();
      if (initialCategorySlug) {
        const path = slug ? `/shop/${slug}` : "/shop";
        router.replace(qs ? `${path}?${qs}` : path, { scroll: false });
      } else {
        if (slug) params.set("category", slug);
        const next = params.toString();
        router.replace(next ? `/shop?${next}` : "/shop", { scroll: false });
      }
    },
    [searchParams, initialCategorySlug, router]
  );

  /* ---------------------------- debounced search box --------------------------- */
  const [searchDraft, setSearchDraft] = useState(q);
  // Keep the input in sync when the query changes from elsewhere (chips, clear all)
  const [lastSyncedQ, setLastSyncedQ] = useState(q);
  if (lastSyncedQ !== q) {
    setLastSyncedQ(q);
    setSearchDraft(q);
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = searchDraft.trim();
      if (trimmed !== q) {
        commitFilters({ q: trimmed || null });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchDraft, q, commitFilters]);

  const clearAllFilters = useCallback(() => {
    setSearchDraft("");
    router.replace("/shop", { scroll: false });
  }, [router]);

  const commitPrice = useCallback(
    (min: number | null, max: number | null) => {
      commitFilters({
        min: min !== null ? String(min) : null,
        max: max !== null ? String(max) : null,
      });
    },
    [commitFilters]
  );

  const toggleValue = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const toggleSize = (size: string) =>
    commitFilters({ sizes: toggleValue(selectedSizes, size).join(",") || null });

  const toggleColor = (name: string) =>
    commitFilters({ colors: toggleValue(selectedColors, name).join(",") || null });

  const setInStockOnly = (checked: boolean) => commitFilters({ stock: checked ? "1" : null });

  const handleSortChange = (value: string) =>
    commitFilters({ sort: value !== "featured" ? value : null });

  /* --------------------------------- data ------------------------------------- */
  const productQuery: ProductQuery = useMemo(
    () => ({
      search: q || undefined,
      categorySlug: activeCategorySlug || undefined,
      minPrice: minPrice ?? undefined,
      maxPrice: maxPrice ?? undefined,
      sizes: selectedSizes.length > 0 ? selectedSizes : undefined,
      colors: selectedColors.length > 0 ? selectedColors : undefined,
      sort: sortParam,
      inStock: inStockOnly || undefined,
    }),
    [q, activeCategorySlug, minPrice, maxPrice, selectedSizes, selectedColors, sortParam, inStockOnly]
  );

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProducts(productQuery);

  const products = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const total = data?.pages[0]?.pagination.total ?? products.length;

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const activeCategory = activeCategorySlug
    ? categories?.find((category) => category.slug === activeCategorySlug) ?? null
    : null;

  // Facets aggregated from loaded products (fallback list before anything loads)
  const availableSizes = useMemo(() => {
    const found = new Set<string>();
    for (const product of products) {
      for (const size of product.sizes) found.add(size);
    }
    return found.size > 0 ? Array.from(found) : FALLBACK_SIZES;
  }, [products]);

  const availableColors = useMemo(() => {
    const byName = new Map<string, ProductColor>();
    for (const product of products) {
      for (const color of product.colors) {
        if (!byName.has(color.name)) byName.set(color.name, color);
      }
    }
    return Array.from(byName.values());
  }, [products]);

  /* --------------------------------- chips ------------------------------------ */
  const chips: ActiveFilterChip[] = [];
  if (q) {
    chips.push({
      id: "q",
      label: `Search: “${q}”`,
      onRemove: () => {
        setSearchDraft("");
        commitFilters({ q: null });
      },
    });
  }
  if (activeCategorySlug) {
    chips.push({
      id: "category",
      label: activeCategory?.name ?? humaniseSlug(activeCategorySlug),
      onRemove: () => commitCategory(null),
    });
  }
  if (minPrice !== null || maxPrice !== null) {
    const label =
      minPrice !== null && maxPrice !== null
        ? `${formatNumber(minPrice)} – ${formatNumber(maxPrice)} KSh`
        : minPrice !== null
          ? `From KSh ${formatNumber(minPrice)}`
          : `Under KSh ${formatNumber(maxPrice ?? 0)}`;
    chips.push({
      id: "price",
      label,
      onRemove: () => commitPrice(null, null),
    });
  }
  for (const size of selectedSizes) {
    chips.push({ id: `size-${size}`, label: `Size: ${size}`, onRemove: () => toggleSize(size) });
  }
  for (const name of selectedColors) {
    const color = availableColors.find((c) => c.name === name);
    chips.push({
      id: `color-${name}`,
      label: name,
      swatch: color?.hex,
      onRemove: () => toggleColor(name),
    });
  }
  if (inStockOnly) {
    chips.push({ id: "stock", label: "In stock only", onRemove: () => setInStockOnly(false) });
  }

  const activeFilterCount = chips.length;
  const hasActiveFilters = activeFilterCount > 0;

  const filterPanel = (idPrefix: string) => (
    <ProductFilters
      idPrefix={idPrefix}
      categories={categories}
      categoriesLoading={categoriesLoading}
      activeCategorySlug={activeCategorySlug}
      onCategoryChange={commitCategory}
      priceMin={minPrice}
      priceMax={maxPrice}
      onPriceChange={commitPrice}
      availableSizes={availableSizes}
      selectedSizes={selectedSizes}
      onToggleSize={toggleSize}
      availableColors={availableColors}
      selectedColors={selectedColors}
      onToggleColor={toggleColor}
      inStockOnly={inStockOnly}
      onInStockChange={setInStockOnly}
      hasActiveFilters={hasActiveFilters}
      onClearAll={clearAllFilters}
    />
  );

  /* --------------------------------- render ----------------------------------- */
  return (
    <div className="container-page py-8 lg:py-12">
      {/* Intro / category banner */}
      {activeCategorySlug ? (
        <header className="rounded-xl border border-border bg-secondary/50 px-6 py-8 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">Category</p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {activeCategory?.name ?? humaniseSlug(activeCategorySlug)}
          </h1>
          {activeCategory?.description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {activeCategory.description}
            </p>
          ) : null}
        </header>
      ) : (
        <header>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
            The Collection
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            Shop
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Dresses, tops, skirts and more — every piece curated with love for the women of Kenya.
          </p>
        </header>
      )}

      {/* Search */}
      <div className="mt-6 max-w-md lg:mt-8">
        <label htmlFor="shop-search" className="sr-only">
          Search products
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="shop-search"
            type="search"
            placeholder="Search pieces…"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            className="h-10 rounded-full border-input bg-background pl-10"
          />
        </div>
      </div>

      <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* Desktop filter rail */}
        <aside className="hidden lg:block">
          <div className="scroll-elegant sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            {filterPanel("shop")}
          </div>
        </aside>

        <section aria-label="Products">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Mobile filters */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full lg:hidden">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Filters
                  {hasActiveFilters ? (
                    <Badge className="ml-0.5 size-5 justify-center rounded-full bg-primary p-0 text-[11px] font-semibold text-primary-foreground hover:bg-primary">
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-80 flex-col gap-0 overflow-y-auto p-0">
                <SheetHeader className="border-b border-border text-left">
                  <SheetTitle className="font-display text-lg font-bold">Filters</SheetTitle>
                  <SheetDescription>Refine the collection to your liking.</SheetDescription>
                </SheetHeader>
                <div className="px-4 py-5">{filterPanel("shop-mobile")}</div>
              </SheetContent>
            </Sheet>

            <p className="text-sm text-muted-foreground" aria-live="polite" aria-atomic="true">
              {isLoading
                ? "Loading pieces…"
                : `${formatNumber(total)} ${total === 1 ? "piece" : "pieces"}`}
            </p>

            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="shop-sort" className="sr-only">
                Sort products
              </label>
              <Select value={sortParam} onValueChange={handleSortChange}>
                <SelectTrigger id="shop-sort" className="w-[190px] rounded-full bg-background">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          <FilterChips chips={chips} onClearAll={clearAllFilters} className="mt-4" />

          {/* Results */}
          <div className="mt-5">
            {isLoading ? (
              <ProductGridSkeleton count={8} />
            ) : isError ? (
              <ErrorState
                title="We could not load the collection"
                message="Please check your connection and try again — your filters are safe."
                onRetry={() => refetch()}
              />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No pieces match your filters"
                description="Try removing a filter or exploring a different category."
                action={
                  <Button className="rounded-full" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                }
              />
            ) : (
              <>
                <ProductGrid products={products} priorityCount={4} />
                {hasNextPage ? (
                  <div className="mt-12 flex justify-center">
                    <Button
                      variant="outline"
                      size="lg"
                      className="min-w-44 rounded-full"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Loading…
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
