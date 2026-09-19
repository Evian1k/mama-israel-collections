import { Skeleton } from "@/components/ui/skeleton";

/** Route-level loading skeleton for checkout */
export default function CheckoutLoading() {
  return (
    <div className="container-page py-8 sm:py-10" aria-hidden="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-6">
              <Skeleton className="h-5 w-32" />
              <div className="mt-4 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-96 w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
