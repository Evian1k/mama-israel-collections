"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

/** Friendly error state with retry — never a blank screen */
export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this right now. Please check your connection and try again.",
  onRetry,
  className,
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/5 text-center",
        compact ? "px-6 py-8" : "px-6 py-14",
        className
      )}
      role="alert"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}
