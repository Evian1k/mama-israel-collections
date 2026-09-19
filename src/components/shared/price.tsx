import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { effectivePrice, hasDiscount } from "@/lib/product-utils";
import type { Product } from "@/types";

interface PriceProps {
  /** The amount the shopper pays */
  amount: number;
  /** Optional original price — struck through when it's greater than amount */
  compareAtAmount?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  currencySymbol?: string;
}

/** Low-level price display: current price + optional struck-through "was" price */
export function Price({
  amount,
  compareAtAmount,
  size = "md",
  className,
  currencySymbol = "KSh",
}: PriceProps) {
  const onSale =
    typeof compareAtAmount === "number" && compareAtAmount > amount;

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span
        className={cn(
          "font-medium tracking-tight",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-2xl",
          onSale && "text-primary"
        )}
      >
        {formatPrice(amount, currencySymbol)}
      </span>
      {onSale ? (
        <span
          className={cn(
            "text-muted-foreground line-through",
            size === "lg" ? "text-base" : "text-xs"
          )}
        >
          {formatPrice(compareAtAmount!, currencySymbol)}
        </span>
      ) : null}
    </span>
  );
}

interface ProductPriceProps extends Omit<PriceProps, "amount" | "compareAtAmount"> {
  product: Pick<Product, "price" | "compareAtPrice">;
}

/** Convenience wrapper for Product objects (handles sale pricing) */
export function ProductPrice({ product, ...rest }: ProductPriceProps) {
  const discounted = hasDiscount(product);
  return (
    <Price
      amount={effectivePrice(product)}
      compareAtAmount={discounted ? product.price : null}
      {...rest}
    />
  );
}
