import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Collection of polished skeleton layouts for loading states */

export function DetailPageSkeleton() {
  return (
    <div className="container-page py-10" aria-hidden="true">
      <Skeleton className="h-4 w-48" />
      <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="size-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

export function RowsSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
          <Skeleton className="size-14 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

export function StatCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 lg:grid-cols-5"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-8 w-16" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border" aria-hidden="true">
      <div className="space-y-0">
        <div className="flex gap-4 border-b border-border bg-secondary/40 px-5 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/60 px-5 py-4 last:border-0">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
