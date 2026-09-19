import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Softens the presentation for in-page sections */
  compact?: boolean;
}

/** Warm, on-brand empty state used wherever data can be absent */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 text-center",
        compact ? "px-6 py-10" : "px-6 py-16",
        className
      )}
      role="status"
    >
      {Icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      ) : null}
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
