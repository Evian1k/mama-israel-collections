import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading skeleton for the shopping bag */
export default function CartLoading() {
  return (
    <div className="container-page py-8 sm:py-10" aria-hidden="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-24" />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-border p-4">
              <Skeleton className="h-[100px] w-20 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-8 w-36" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-96 w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
