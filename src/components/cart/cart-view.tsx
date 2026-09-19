"use client";

import Link from "next/link";
import { ArrowRight, Info, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Price } from "@/components/shared/price";
import { QuantityInput } from "@/components/shared/quantity-input";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { CartItemThumb } from "@/components/cart/cart-item-thumb";
import { useCart } from "@/features/cart/use-cart";
import { deliveryDisplay, variantLabel } from "@/features/checkout/summary";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { storeConfig } from "@/config/store";
import { formatPrice } from "@/lib/format";
import { cartOrderMessage } from "@/lib/whatsapp";
import type { CartItem } from "@/types/cart";

/**
 * Shopping bag: line items + sticky order summary.
 * Everything is client-side cart state; totals are display only.
 */
export function CartView() {
  const { items, hydrated, count, subtotal, updateQuantity, removeItem } = useCart();
  const { data: settings } = useStoreSettings();

  if (!hydrated) {
    return <CartSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="container-page py-16 sm:py-24">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Discover the collection and add pieces you love."
          action={
            <Button asChild size="lg" className="rounded-full">
              <Link href="/shop">Shop the Collection</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const delivery = deliveryDisplay(subtotal, settings?.delivery);
  const total = subtotal + (delivery.fee ?? 0);
  const storeName = settings?.name ?? storeConfig.name;

  return (
    <div className="container-page py-8 sm:py-10">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Your Shopping Bag
        </h1>
        <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </header>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        {/* Line items */}
        <section aria-label="Items in your bag" className="space-y-4 lg:col-span-2">
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.key}>
                <CartRow
                  item={item}
                  onQuantityChange={(quantity) => updateQuantity(item.key, quantity)}
                  onRemove={() => {
                    removeItem(item.key);
                    toast("Removed from your bag", { description: item.name });
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        {/* Summary */}
        <aside aria-label="Order summary" className="w-full lg:sticky lg:top-20">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg font-semibold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span
                  className={delivery.label === "FREE" ? "font-medium text-gold" : "font-medium"}
                >
                  {delivery.label}
                </span>
              </div>
              {settings?.delivery.note ? (
                <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {settings.delivery.note}
                </p>
              ) : null}

              <Separator />

              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display text-lg font-semibold text-foreground">
                  Total estimate
                </span>
                <span className="font-display text-2xl font-semibold text-primary">
                  {formatPrice(total)}
                </span>
              </div>
              {!delivery.confirmed ? (
                <p className="text-xs text-muted-foreground">
                  Delivery will be confirmed when we call or message you about your order.
                </p>
              ) : null}

              <Button asChild size="lg" className="w-full rounded-full">
                <Link href="/checkout">
                  Proceed to Checkout
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full rounded-full">
                <Link href="/shop">Continue shopping</Link>
              </Button>

              <Separator />

              <WhatsAppButton
                variant="outline"
                label="Order via WhatsApp instead"
                className="w-full rounded-full"
                message={cartOrderMessage({ items, subtotal, storeName })}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function CartRow({
  item,
  onQuantityChange,
  onRemove,
}: {
  item: CartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}) {
  const variant = variantLabel(item.size, item.color);
  const lastOne = item.maxQuantity === 1;

  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <Link
        href={`/products/${item.slug}`}
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        tabIndex={-1}
        aria-hidden="true"
      >
        <CartItemThumb item={item} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold leading-snug">
              <Link
                href={`/products/${item.slug}`}
                className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {item.name}
              </Link>
            </h3>
            {variant ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{variant}</p>
            ) : null}
            {lastOne ? (
              <p className="mt-1 text-[11px] font-medium text-amber-900">Last one in stock</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Remove ${item.name} from bag`}
            onClick={onRemove}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-auto">
          <div className="flex items-center gap-3">
            <QuantityInput
              value={item.quantity}
              min={1}
              max={item.maxQuantity}
              onChange={onQuantityChange}
              size="sm"
              aria-label={`Quantity for ${item.name}`}
            />
            <span className="text-xs text-muted-foreground">
              {formatPrice(item.price)} each
            </span>
          </div>
          <Price amount={item.price * item.quantity} size="md" />
        </div>
      </div>
    </article>
  );
}

function CartSkeleton() {
  return (
    <div className="container-page py-8 sm:py-10" aria-hidden="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-24" />
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-border p-4">
              <Skeleton className="h-[100px] w-20 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-8 w-36" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="hidden h-96 w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}
