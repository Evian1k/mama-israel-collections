import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "positive" | "warning" | "danger";
  className?: string;
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-secondary text-foreground",
  positive: "bg-emerald-100 text-emerald-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-900",
};

/** Dashboard metric card — every number comes from the API (never faked) */
export function StatCard({ label, value, icon: Icon, hint, tone = "default", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
