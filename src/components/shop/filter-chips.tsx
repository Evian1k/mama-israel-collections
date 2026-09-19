"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveFilterChip {
  id: string;
  label: string;
  /** Optional colour hex shown as a dot inside the chip */
  swatch?: string;
  onRemove: () => void;
}

interface FilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  className?: string;
}

/** Removable chips summarising every active shop filter, plus "Clear all" */
export function FilterChips({ chips, onClearAll, className }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Active filters"
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 py-1 pl-3 pr-1.5 text-xs font-medium text-foreground"
        >
          {chip.swatch ? (
            <span
              className="size-3 rounded-full border border-border"
              style={{ backgroundColor: chip.swatch }}
              aria-hidden="true"
            />
          ) : null}
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter: ${chip.label}`}
            className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 rounded-sm text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Clear all
      </button>
    </div>
  );
}
