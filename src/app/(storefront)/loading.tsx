import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading for the storefront group — an elegant, on-brand
 * skeleton of a content page (heading + intro + card grid).
 */
export default function StorefrontLoading() {
  return (
    <div className="container-page py-16" role="status" aria-label="Loading page">
      {/* Heading block */}
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <Skeleton className="mx-auto h-3.5 w-28 rounded-full" />
        <Skeleton className="mx-auto h-11 w-3/4" />
        <Skeleton className="mx-auto h-4 w-full" />
        <Skeleton className="mx-auto h-4 w-5/6" />
      </div>

      {/* Card grid */}
      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
