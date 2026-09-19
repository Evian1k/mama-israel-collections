"use client";

import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAdminCategories, useAdminProduct } from "@/hooks/admin/use-admin-data";
import { PackageSearch } from "lucide-react";
import { ProductForm } from "./product-form";

function EditProductSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-hidden="true">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/** Client shell for /admin/products/[id]/edit — loads the product, guards 404 */
export function EditProductPage({ id }: { id: string }) {
  const productQuery = useAdminProduct(id);
  const categoriesQuery = useAdminCategories();

  const loading = productQuery.isPending || categoriesQuery.isPending;

  if (loading) {
    return <EditProductSkeleton />;
  }

  if (productQuery.isError) {
    const status = (productQuery.error as { status?: number }).status;
    if (status === 404) {
      return (
        <EmptyState
          icon={PackageSearch}
          title="Product not found"
          description="This piece may have been deleted. Head back to the catalogue to manage the rest of the collection."
          action={
            <Button asChild className="rounded-full">
              <Link href="/admin/products">Back to products</Link>
            </Button>
          }
        />
      );
    }
    return (
      <ErrorState
        title="We could not load this product"
        message="Something went wrong while fetching the product. Please try again."
        onRetry={() => void productQuery.refetch()}
      />
    );
  }

  if (categoriesQuery.isError || !productQuery.data) {
    return (
      <ErrorState
        title="We could not load this product"
        message="Something went wrong while fetching the catalogue data. Please try again."
        onRetry={() => {
          void productQuery.refetch();
          void categoriesQuery.refetch();
        }}
      />
    );
  }

  return (
    <div>
      <Link
        href="/admin/products"
        className="mb-2 inline-flex text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ← Back to products
      </Link>
      <PageHeader
        title="Edit product"
        description={productQuery.data.name}
        className="mb-8"
      />
      <ProductForm
        mode="edit"
        productId={id}
        initial={productQuery.data}
        categories={categoriesQuery.data ?? []}
      />
    </div>
  );
}
