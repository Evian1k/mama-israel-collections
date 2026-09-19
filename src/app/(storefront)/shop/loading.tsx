import { Skeleton } from "@/components/ui/skeleton";
import { ProductGridSkeleton } from "@/components/shared/product-grid";

/** Route-level loading for /shop — mirrors the final layout while data streams in */
export default function ShopLoading() {
  return (
    <div className="container-page py-8 lg:py-12" aria-busy="true">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-3 h-10 w-72 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />

      <div className="mt-8 flex items-center justify-between gap-4">
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-44 rounded-full" />
      </div>

      <div className="mt-6">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
