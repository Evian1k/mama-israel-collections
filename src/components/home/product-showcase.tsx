"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProductGrid, ProductGridSkeleton } from "@/components/shared/product-grid";
import { useFeaturedProducts, useNewArrivals } from "@/hooks/use-products";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

const EMPTY_TITLE = "Nothing here yet — new pieces are on their way.";

interface ProductShowcaseProps {
  eyebrow: string;
  title: string;
  description?: string;
  /** Result of a products list hook (useNewArrivals / useFeaturedProducts) */
  products: UseQueryResult<Product[], Error>;
  /** Where "View all" points — defaults to the shop page */
  viewAllHref?: string;
  /** "sand" renders the section on a soft sand band for alternating rhythm */
  tone?: "default" | "sand";
}

/**
 * Reusable product section — heading + "View all", then exactly four pieces
 * on desktop with complete loading / error / empty states. Never invents
 * products: whatever the API has (or has not) is what appears.
 */
export function ProductShowcase({
  eyebrow,
  title,
  description,
  products,
  viewAllHref = "/shop",
  tone = "default",
}: ProductShowcaseProps) {
  const { data, isLoading, isError, error, refetch } = products;
  const items = data?.slice(0, 4) ?? [];

  return (
    <section aria-label={title} className={cn(tone === "sand" && "bg-secondary/40")}>
      <div className="container-page py-16 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <SectionHeading eyebrow={eyebrow} title={title} description={description} align="left" />
          <Button
            asChild
            variant="outline"
            className="mb-1 hidden rounded-full px-5 sm:inline-flex"
          >
            <Link href={viewAllHref}>
              View all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="mt-10 lg:mt-12">
          {isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : isError ? (
            <ErrorState
              title="We could not load these pieces"
              message={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
              compact
            />
          ) : items.length === 0 ? (
            <EmptyState icon={ShoppingBag} title={EMPTY_TITLE} compact />
          ) : (
            <>
              <ProductGrid products={items} />
              <div className="mt-8 text-center sm:hidden">
                <Button asChild variant="outline" className="rounded-full px-6">
                  <Link href={viewAllHref}>
                    View all
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Home: latest additions (client hook wired to the section) */
export function NewArrivalsShowcase() {
  const products = useNewArrivals(4);
  return (
    <ProductShowcase
      eyebrow="Just landed"
      title="New Arrivals"
      description="Fresh pieces added to the boutique — be the first to wear them."
      products={products}
      tone="sand"
    />
  );
}

/** Home: owner-picked favourites (client hook wired to the section) */
export function FeaturedShowcase() {
  const products = useFeaturedProducts(4);
  return (
    <ProductShowcase
      eyebrow="Handpicked for you"
      title="Featured Collection"
      description="A few of our favourites, chosen with love from the collection."
      products={products}
    />
  );
}
