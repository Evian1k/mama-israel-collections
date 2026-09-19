import { cn } from "@/lib/utils";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  /** Tailwind column classes; defaults to a responsive 2/3/4 layout */
  columnsClassName?: string;
  className?: string;
  /** Priority-load first images */
  priorityCount?: number;
}

const DEFAULT_COLUMNS =
  "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4";

export function ProductGrid({
  products,
  columnsClassName = DEFAULT_COLUMNS,
  className,
  priorityCount = 0,
}: ProductGridProps) {
  return (
    <div className={cn("grid gap-x-4 gap-y-8 sm:gap-x-6", columnsClassName, className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({
  count = 8,
  columnsClassName = DEFAULT_COLUMNS,
  className,
}: {
  count?: number;
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-x-4 gap-y-8 sm:gap-x-6", columnsClassName, className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
