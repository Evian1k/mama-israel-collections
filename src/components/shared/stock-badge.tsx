import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { stockLabel } from "@/lib/product-utils";
import type { Product } from "@/types";

const TONE_CLASSES: Record<string, string> = {
  in_stock: "border-emerald-200 bg-emerald-50 text-emerald-900",
  low_stock: "border-amber-200 bg-amber-50 text-amber-900",
  out_of_stock: "border-stone-300 bg-stone-100 text-stone-600",
};

/** In stock / Only N left / Out of stock */
export function StockBadge({ product, className }: { product: Product; className?: string }) {
  const { tone, label } = stockLabel(product);
  return (
    <Badge variant="outline" className={cn("font-medium", TONE_CLASSES[tone], className)}>
      {label}
    </Badge>
  );
}
