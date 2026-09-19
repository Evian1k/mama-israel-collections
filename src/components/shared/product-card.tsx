"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductPrice } from "@/components/shared/price";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  discountPercent,
  isLowStock,
  isOutOfStock,
  primaryImage,
  productUrl,
  secondaryImage,
} from "@/lib/product-utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  className?: string;
  /** Priority-load the first row of images (LCP) */
  priority?: boolean;
}

/** Editorial product card — hover image swap, sale/new badges, colour dots */
export function ProductCard({ product, className, priority = false }: ProductCardProps) {
  const main = primaryImage(product);
  const hover = secondaryImage(product);
  const soldOut = isOutOfStock(product);
  const lowStock = isLowStock(product);
  const salePct = discountPercent(product);

  return (
    <article className={cn("group relative", className)}>
      <Link
        href={productUrl(product)}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
        aria-label={`View ${product.name}${product.category ? ` in ${product.category.name}` : ""}`}
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border border-border/70 bg-secondary/50">
          {main ? (
            <Image
              src={main.url}
              alt={main.alt || product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                "object-cover transition-opacity duration-500 group-hover:opacity-0",
                soldOut && "opacity-90 saturate-50"
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="font-display text-3xl text-muted-foreground/50">
                {product.name.slice(0, 1)}
              </span>
            </div>
          )}
          {hover ? (
            <Image
              src={hover.url}
              alt=""
              aria-hidden="true"
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          ) : null}

          {/* Badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {soldOut ? (
              <Badge className="bg-stone-900/85 text-stone-50 hover:bg-stone-900/85">
                Out of stock
              </Badge>
            ) : null}
            {!soldOut && salePct ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                −{salePct}%
              </Badge>
            ) : null}
            {!soldOut && product.isNewArrival && !salePct ? (
              <Badge variant="outline" className="border-gold/60 bg-background/90 text-foreground">
                New
              </Badge>
            ) : null}
          </div>
          {lowStock && !soldOut ? (
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-amber-900 shadow-sm">
              Only {product.stockQuantity} left
            </span>
          ) : null}
        </div>

        <div className="pt-3">
          {product.category ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {product.category.name}
            </p>
          ) : null}
          <h3 className="mt-1 font-display text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {product.name}
          </h3>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <ProductPrice product={product} size="sm" />
            {product.colors.length > 0 ? (
              <span className="flex items-center gap-1" aria-label={`${product.colors.length} colour(s) available`}>
                {product.colors.slice(0, 4).map((color) => (
                  <span
                    key={color.name}
                    className="size-3 rounded-full border border-border"
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      <Skeleton className="aspect-[3/4] w-full rounded-lg" />
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}
