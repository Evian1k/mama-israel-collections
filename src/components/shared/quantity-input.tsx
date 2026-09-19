"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/** Accessible quantity stepper that never allows invalid values */
export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = "md",
  className,
  "aria-label": ariaLabel = "Quantity",
}: QuantityInputProps) {
  const safeMax = Math.max(min, max);
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && value < safeMax;

  const btn =
    size === "sm"
      ? "size-7 rounded-md"
      : "size-9 rounded-md";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-input bg-background",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(btn, "hover:bg-secondary")}
        onClick={() => canDecrease && onChange(value - 1)}
        disabled={!canDecrease}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" aria-hidden="true" />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className={cn(
          "w-10 border-0 bg-transparent p-0 text-center text-sm font-medium tabular-nums outline-none",
          size === "sm" && "w-8"
        )}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          const parsed = parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (Number.isNaN(parsed)) {
            onChange(min);
          } else {
            onChange(Math.min(Math.max(parsed, min), safeMax));
          }
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(btn, "hover:bg-secondary")}
        onClick={() => canIncrease && onChange(value + 1)}
        disabled={!canIncrease}
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  );
}
