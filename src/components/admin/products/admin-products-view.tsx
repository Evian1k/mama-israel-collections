"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  SearchX,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { TableSkeleton } from "@/components/shared/skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAdminCategories,
  useAdminProductMutations,
  useAdminProducts,
} from "@/hooks/admin/use-admin-data";
import { useDevDataControls } from "@/hooks/admin/use-admin-stats";
import { ApiError } from "@/services/api/client";
import { formatNumber, formatPrice } from "@/lib/format";
import { effectivePrice, hasDiscount, isLowStock, isOutOfStock, primaryImage } from "@/lib/product-utils";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;
/** Dev adapter caps one page at 48 — status filtering therefore narrows client-side */
const STATUS_SCAN_LIMIT = 48;
const SEARCH_DEBOUNCE_MS = 300;

type StatusFilter = "all" | "active" | "inactive" | "out" | "low";

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All products" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "out", label: "Out of stock" },
  { value: "low", label: "Low stock" },
];

function matchesStatus(product: Product, status: StatusFilter): boolean {
  switch (status) {
    case "active":
      return product.isActive;
    case "inactive":
      return !product.isActive;
    case "out":
      return isOutOfStock(product);
    case "low":
      return isLowStock(product);
    default:
      return true;
  }
}

/* ------------------------------ shared pieces ------------------------------ */

function ProductThumb({ product }: { product: Product }) {
  const [broken, setBroken] = useState(false);
  const image = primaryImage(product);

  if (!image || broken) {
    return (
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-secondary font-display text-sm font-bold uppercase text-primary"
      >
        {product.name.charAt(0) || "M"}
      </span>
    );
  }

  return (
    <span className="relative block size-12 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40">
      <Image
        src={image.url}
        alt=""
        fill
        sizes="48px"
        className="object-cover"
        onError={() => setBroken(true)}
      />
    </span>
  );
}

function StockCell({ product }: { product: Product }) {
  return (
    <span className="flex items-center gap-2">
      <span className="tabular-nums text-foreground">{formatNumber(product.stockQuantity)}</span>
      {isOutOfStock(product) ? (
        <Badge variant="outline" className="border-red-200 bg-red-50 text-red-900">
          Out
        </Badge>
      ) : isLowStock(product) ? (
        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-900">
          Low
        </Badge>
      ) : null}
    </span>
  );
}

function FlagsCell({ product }: { product: Product }) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      {product.isFeatured ? (
        <Badge variant="outline" className="gap-1 border-gold/40 bg-gold-soft/60 text-foreground">
          <Star className="size-3 fill-gold text-gold" aria-hidden="true" />
          Featured
        </Badge>
      ) : null}
      {product.isNewArrival ? <Badge variant="secondary">New</Badge> : null}
      {!product.isFeatured && !product.isNewArrival ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : null}
    </span>
  );
}

function StatusCell({ product }: { product: Product }) {
  return product.isActive ? (
    <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-900">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1.5 border-border bg-secondary/60 text-muted-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-stone-400" />
      Inactive
    </Badge>
  );
}

function ProductRowActions({
  product,
  onDelete,
  deletePending,
}: {
  product: Product;
  onDelete: (product: Product) => void;
  deletePending: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={`Actions for ${product.name}`}
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/admin/products/${product.id}/edit`}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`/products/${product.slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden="true" />
            View in store
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={deletePending}
          onSelect={() => onDelete(product)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* --------------------------------- the view -------------------------------- */

export function AdminProductsView() {
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const categoriesQuery = useAdminCategories();
  const categories = categoriesQuery.data ?? [];
  const { remove } = useAdminProductMutations();
  const { seedSample } = useDevDataControls();

  /* 300ms debounced search — commit happens in the timer callback */
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchDraft.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchDraft]);

  const isServerPaginated = statusFilter === "all";
  const searchTerm = debouncedSearch !== "" ? debouncedSearch : undefined;
  const categoryId = categoryFilter !== "all" ? categoryFilter : undefined;

  const productsQuery = useAdminProducts({
    page: isServerPaginated ? page : 1,
    limit: isServerPaginated ? PAGE_SIZE : STATUS_SCAN_LIMIT,
    search: searchTerm,
    categoryId,
  });

  const allItems = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const filtered = useMemo(
    () => allItems.filter((product) => matchesStatus(product, statusFilter)),
    [allItems, statusFilter]
  );

  const serverPagination = productsQuery.data?.pagination;
  const totalPages = isServerPaginated
    ? Math.max(1, serverPagination?.totalPages ?? 1)
    : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  /* Render-time state adjustment: clamp the page when the list shrinks
     (e.g. deleting the last row on the last page) — no effects needed. */
  const displayPage = Math.min(Math.max(1, page), totalPages);
  if (displayPage !== page) {
    setPage(displayPage);
  }

  const rows = isServerPaginated
    ? filtered
    : filtered.slice((displayPage - 1) * PAGE_SIZE, displayPage * PAGE_SIZE);
  const total = isServerPaginated ? serverPagination?.total ?? 0 : filtered.length;
  const storeIsEmpty = (serverPagination?.total ?? 0) === 0 && statusFilter === "all" && !searchTerm && categoryFilter === "all";

  const hasActiveFilters =
    statusFilter !== "all" || categoryFilter !== "all" || searchTerm !== undefined;

  const clearFilters = () => {
    setSearchDraft("");
    setDebouncedSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success("Product deleted");
        setDeleteTarget(null);
      },
      onError: (error) => {
        const message =
          error instanceof ApiError && error.message
            ? error.message
            : "We could not delete this product. Please try again.";
        toast.error(message);
      },
    });
  };

  const isLoading = productsQuery.isPending;
  const isError = productsQuery.isError;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your catalogue."
        actions={
          <Button asChild className="rounded-full">
            <Link href="/admin/products/new">
              <Plus className="size-4" aria-hidden="true" />
              New product
            </Link>
          </Button>
        }
      />

      {/* -------------------------------- toolbar -------------------------------- */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Label htmlFor="product-search" className="sr-only">
            Search products
          </Label>
          <Input
            id="product-search"
            type="search"
            value={searchDraft}
            placeholder="Search by name, description or SKU…"
            className="pl-9"
            onChange={(event) => {
              setSearchDraft(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex gap-2">
          <div>
            <Label htmlFor="product-status" className="sr-only">
              Status
            </Label>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger id="product-status" className="w-40" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="product-category" className="sr-only">
              Category
            </Label>
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger id="product-category" className="w-44" aria-label="Filter by category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* --------------------------------- body ---------------------------------- */}
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ErrorState
          title="We could not load your products"
          message="Something went wrong while fetching the catalogue. Please try again."
          onRetry={() => void productsQuery.refetch()}
        />
      ) : storeIsEmpty ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first piece to open the collection."
          action={
            <div className="flex flex-col items-center gap-3">
              <Button asChild className="rounded-full">
                <Link href="/admin/products/new">
                  <Plus className="size-4" aria-hidden="true" />
                  New product
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                disabled={seedSample.isPending}
                onClick={() =>
                  seedSample.mutate(undefined, {
                    onSuccess: (result) =>
                      toast.success(result?.message ?? "Sample catalogue loaded"),
                    onError: (error) =>
                      toast.error(
                        error instanceof ApiError && error.message
                          ? error.message
                          : "Could not load sample data."
                      ),
                  })
                }
              >
                {seedSample.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden="true" />
                )}
                Load sample catalogue (dev data)
              </Button>
            </div>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No products match your filters"
          description="Try a different search term, status or category."
          action={
            <Button variant="outline" className="rounded-full" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          {/* ------------------------------- table (md+) ------------------------------ */}
          <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead className="w-24">Image</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <ProductThumb product={product} />
                    </TableCell>
                    <TableCell className="max-w-64">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {product.sku || product.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.category?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatPrice(effectivePrice(product))}
                      </span>
                      {hasDiscount(product) ? (
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <StockCell product={product} />
                    </TableCell>
                    <TableCell>
                      <FlagsCell product={product} />
                    </TableCell>
                    <TableCell>
                      <StatusCell product={product} />
                    </TableCell>
                    <TableCell>
                      <ProductRowActions
                        product={product}
                        onDelete={setDeleteTarget}
                        deletePending={remove.isPending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* ------------------------------ cards (mobile) ---------------------------- */}
          <ul className="space-y-3 md:hidden">
            {rows.map((product) => (
              <li
                key={product.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex gap-3">
                  <ProductThumb product={product} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="block truncate font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {product.name}
                    </Link>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {product.sku || product.slug}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium tabular-nums">
                        {formatPrice(effectivePrice(product))}
                      </span>
                      {hasDiscount(product) ? (
                        <span className="ml-1.5 text-xs tabular-nums text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {product.category?.name ?? "No category"}
                    </p>
                  </div>
                  <ProductRowActions
                    product={product}
                    onDelete={setDeleteTarget}
                    deletePending={remove.isPending}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                  <StockCell product={product} />
                  <FlagsCell product={product} />
                  <span className="ml-auto">
                    <StatusCell product={product} />
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* ------------------------------- pagination ------------------------------- */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Page {displayPage} of {formatNumber(totalPages)} ·{" "}
              {formatNumber(total)} {total === 1 ? "product" : "products"}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={displayPage <= 1}
                onClick={() => setPage(displayPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={displayPage >= totalPages}
                onClick={() => setPage(displayPage + 1)}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {statusFilter !== "all" && filtered.length >= STATUS_SCAN_LIMIT ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the first {STATUS_SCAN_LIMIT} matching pieces — refine your filters to narrow
              further.
            </p>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Clear all filters
            </button>
          ) : null}
        </>
      )}

      {/* ------------------------------ delete dialog ----------------------------- */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product from your catalogue. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {remove.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
