"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface CartItemThumbProps {
  item: { name: string; imageUrl?: string | null };
  /** Override the default 80×100 portrait size (e.g. "h-14 w-14" for compact rows) */
  className?: string;
}

/**
 * Cart line thumbnail with a graceful brand-monogram fallback when the item
 * has no image (or the image fails to load).
 */
export function CartItemThumb({ item, className }: CartItemThumbProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(item.imageUrl) && !failed;

  return (
    <div
      className={cn(
        "relative h-[100px] w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/60",
        className
      )}
    >
      {showImage ? (
        <Image
          src={item.imageUrl as string}
          alt={item.name}
          fill
          sizes="80px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
          <span className="font-display text-2xl font-semibold text-muted-foreground/50">
            {item.name.slice(0, 1).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
