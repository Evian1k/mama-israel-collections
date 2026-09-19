"use client";

import Link from "next/link";
import { Tags } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAdminCategories } from "@/hooks/admin/use-admin-data";
import { ProductForm } from "./product-form";

function NewProductSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-hidden="true">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

/** Client shell for /admin/products/new — guards category readiness before the form */
export function NewProductPage() {
  const categoriesQuery = useAdminCategories();

  if (categoriesQuery.isPending) {
    return <NewProductSkeleton />;
  }

  if (categoriesQuery.isError) {
    return (
      <ErrorState
        title="We could not load your categories"
        message="Products need a category. Please try again."
        onRetry={() => void categoriesQuery.refetch()}
      />
    );
  }

  if (categoriesQuery.data.length === 0) {
    return (
      <EmptyState
        icon={Tags}
        title="Create a category first"
        description="Every product belongs to a category — like Dresses or Tops. Set up your first one, then come back to add products."
        action={
          <Button asChild className="rounded-full">
            <Link href="/admin/categories">Go to categories</Link>
          </Button>
        }
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
        title="New product"
        description="Add a new piece to the collection."
        className="mb-8"
      />
      <ProductForm mode="create" categories={categoriesQuery.data} />
    </div>
  );
}
