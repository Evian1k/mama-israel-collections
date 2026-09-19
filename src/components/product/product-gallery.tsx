"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { sortedImages } from "@/lib/product-utils";
import type { Product } from "@/types";

interface ProductGalleryProps {
  product: Product;
}

/**
 * Product image gallery — main frame with a thumbnail strip.
 * Thumbnails switch on hover or click; fully keyboard accessible.
 */
export function ProductGallery({ product }: ProductGalleryProps) {
  const images = sortedImages(product);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lastProductId, setLastProductId] = useState(product.id);

  // Reset the selection when a different product is displayed (render-time adjust)
  if (lastProductId !== product.id) {
    setLastProductId(product.id);
    setActiveIndex(0);
  }

  const active = images[activeIndex] ?? images[0] ?? null;

  return (
    <div>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-border bg-secondary/40">
        {active ? (
          <Image
            key={active.id}
            src={active.url}
            alt={active.alt || product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-secondary"
            role="img"
            aria-label={`${product.name} — no photo available yet`}
          >
            <span
              className="font-display text-7xl text-muted-foreground/40"
              aria-hidden="true"
            >
              {product.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2.5" role="group" aria-label="Product images">
          {images.map((image, index) => {
            const selected = index === activeIndex;
            return (
              <button
                key={image.id}
                type="button"
                aria-pressed={selected}
                aria-label={`View image ${index + 1} of ${images.length}`}
                onClick={() => setActiveIndex(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected
                    ? "border-primary opacity-100 ring-2 ring-primary ring-offset-1 ring-offset-background"
                    : "border-border opacity-80 hover:border-primary/50 hover:opacity-100"
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
