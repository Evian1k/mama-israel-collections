"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import type { Category } from "@/types";

/** Skeleton card shown while categories load */
function CategoryCardSkeleton() {
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/70 bg-card">
      <Skeleton className="absolute inset-0 rounded-none" />
    </div>
  );
}

/**
 * Category card — photo with a wine gradient overlay + name, or an elegant
 * sand-gradient card with a big display monogram when no image exists yet.
 */
function CategoryCard({ category }: { category: Category }) {
  const monogram = (category.name.trim().charAt(0) || "M").toUpperCase();

  return (
    <Link
      href={`/shop/${category.slug}`}
      aria-label={`Shop the ${category.name} collection`}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border/70 bg-secondary/50 transition-shadow duration-300 group-hover:shadow-lg group-focus-visible:shadow-lg">
        {category.imageUrl ? (
          <>
            <Image
              src={category.imageUrl}
              alt={`${category.name} collection`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-wine/85 via-wine/15 to-transparent"
            />
            <h3 className="absolute inset-x-0 bottom-0 p-4 font-display text-lg font-semibold leading-snug text-white sm:text-xl">
              {category.name}
            </h3>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-secondary via-secondary to-gold-soft p-6 text-center">
            <span
              aria-hidden="true"
              className="font-display text-5xl font-semibold leading-none text-gold/80 sm:text-6xl"
            >
              {monogram}
            </span>
            <h3 className="font-display text-lg font-semibold leading-snug text-foreground sm:text-xl">
              {category.name}
            </h3>
          </div>
        )}
      </div>
    </Link>
  );
}

/** "Shop by Category" — live data with graceful loading / error / empty states */
export function CategoryShowcase() {
  const { data: categories, isLoading, isError, error, refetch } = useCategories();

  return (
    <section aria-labelledby="categories-heading" className="container-page py-16 lg:py-24">
      <SectionHeading
        eyebrow="Collections"
        title="Shop by Category"
        description="Find the piece that feels like you — browse the boutique one collection at a time."
      />

      <div className="mt-10 lg:mt-14">
        {isLoading ? (
          <div role="status" className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            <span className="sr-only">Loading categories…</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="We could not load the collections"
            message={error instanceof Error ? error.message : undefined}
            onRetry={() => refetch()}
          />
        ) : !categories || categories.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No collections available yet."
            description="Our first collections are being prepared — check back soon."
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
