"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/admin/use-admin-stats";
import { adminSystemApi, type ProductionCheckItem } from "@/services/api/admin/system";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const STATUS_ICONS = {
  pass: { Icon: CheckCircle2, className: "text-green-700" },
  warn: { Icon: AlertTriangle, className: "text-amber-600" },
  fail: { Icon: XCircle, className: "text-destructive" },
} as const;

function CheckRow({ check }: { check: ProductionCheckItem }) {
  const { Icon, className } = STATUS_ICONS[check.status];
  return (
    <li className="flex items-start gap-3">
      <Icon className={cn("mt-0.5 size-4.5 shrink-0", className)} aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{check.label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{check.detail}</p>
      </div>
    </li>
  );
}

/**
 * Admin → Settings → Production readiness.
 * The owner's honest configuration checklist, served by
 * GET /api/admin/system/production-check.
 */
export function ProductionCheckCard() {
  const { token } = useAdminSession();
  const check = useQuery({
    queryKey: queryKeys.admin.productionCheck(token),
    queryFn: ({ signal }) => adminSystemApi.productionCheck(token!, signal),
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const checks = check.data?.checks ?? [];
  const issueCount = checks.filter((c) => c.status !== "pass").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-gold" aria-hidden="true" />
              Production readiness
            </CardTitle>
            <CardDescription>
              An honest checklist of what is configured before you open the store.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => void check.refetch()}
            disabled={check.isFetching}
          >
            <RefreshCw
              className={cn("size-3.5", check.isFetching && "animate-spin")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {check.isPending ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <span className="sr-only">Checking configuration…</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-4.5 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
            ))}
          </div>
        ) : check.isError ? (
          <p role="alert" className="text-sm text-muted-foreground">
            The readiness checklist could not be loaded —{" "}
            {check.error instanceof Error ? check.error.message : "please try again."}
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full font-medium">
                Environment: {check.data?.environment ?? "unknown"}
              </Badge>
              <span
                className={cn(
                  "text-sm font-medium",
                  check.data?.ok ? "text-green-700" : "text-amber-700"
                )}
              >
                {check.data?.ok
                  ? "All required configuration present"
                  : `${issueCount} ${issueCount === 1 ? "issue" : "issues"} found`}
              </span>
            </div>
            <ul className="space-y-3.5">
              {checks.map((item) => (
                <CheckRow key={item.id} check={item} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
