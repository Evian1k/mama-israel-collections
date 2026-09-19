"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, SearchX, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProductPrice } from "@/components/shared/price";
import { ProductGrid } from "@/components/shared/product-grid";
import { QuantityInput } from "@/components/shared/quantity-input";
import { StockBadge } from "@/components/shared/stock-badge";
import { DetailPageSkeleton } from "@/components/shared/skeletons";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ProductGallery } from "@/components/product/product-gallery";
import { useCart } from "@/features/cart/use-cart";
import { useProduct, useProducts } from "@/hooks/use-products";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatPrice } from "@/lib/format";
import {
  discountPercent,
  effectivePrice,
  isLowStock,
  isOutOfStock,
  primaryImage,
} from "@/lib/product-utils";
import { productEnquiryMessage } from "@/lib/whatsapp";
import { ApiError } from "@/services/api/client";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductDetailProps {
  slug: string;
  /** Server-fetched product so the first paint is instant */
  initialProduct?: Product;
}

const ADD_FEEDBACK_MS = 350;

/**
 * Product detail page body — gallery, variant selection, add to bag,
 * WhatsApp ordering, delivery info and related pieces.
 */
export function ProductDetail({ slug, initialProduct }: ProductDetailProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { data: settings } = useStoreSettings();

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useProduct(slug, { initialData: initialProduct });

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [productUrl, setProductUrl] = useState<string | undefined>(undefined);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Absolute link for WhatsApp enquiries — only known after mount
  useEffect(() => {
    setProductUrl(`${window.location.origin}/products/${slug}`);
  }, [slug]);

  // Reset variant selection when a different product is displayed
  useEffect(() => {
    setSize(null);
    setColor(null);
    setQuantity(1);
    setSizeError(false);
  }, [product?.id]);

  useEffect(() => {
    return () => {
      if (addTimer.current) clearTimeout(addTimer.current);
    };
  }, []);

  /* ------------------------------ related pieces ------------------------------ */
  const relatedCategorySlug = product?.category?.slug || undefined;
  const relatedQuery = useProducts({ categorySlug: relatedCategorySlug });
  const related = useMemo(() => {
    if (!product) return [];
    return (relatedQuery.data?.pages[0]?.items ?? [])
      .filter((candidate) => candidate.id !== product.id)
      .slice(0, 4);
  }, [relatedQuery.data, product]);

  /* --------------------------------- states ----------------------------------- */
  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (isError) {
    const status = error instanceof ApiError ? error.status : undefined;
    if (status === 404) {
      return (
        <div className="container-page py-16">
          <EmptyState
            icon={SearchX}
            title="This piece is no longer available"
            description="It may have sold out or been removed from the collection."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild className="rounded-full">
                  <Link href="/shop">Continue shopping</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/">Home</Link>
                </Button>
              </div>
            }
          />
        </div>
      );
    }
    return (
      <div className="container-page py-16">
        <ErrorState
          title="We could not load this piece"
          message="Something went wrong on our side. Please try again in a moment."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!product) return null;

  /* --------------------------------- derived ---------------------------------- */
  const soldOut = isOutOfStock(product);
  const lowStock = isLowStock(product);
  const salePct = discountPercent(product);
  const categoryName = product.category?.name ?? "Collection";
  const storeName = settings?.name ?? "Mama Israel Collections";

  const enquiryMessage = productEnquiryMessage({
    product,
    size,
    color,
    quantity,
    storeName,
    productUrl,
  });

  const restockMessage = [
    `Hello ${storeName}! 👋`,
    "",
    `I saw "${product.name}" on your website — it is currently out of stock.`,
    "Could you let me know when it is back?",
  ].join("\n");

  const handleAddToCart = () => {
    if (product.sizes.length > 0 && !size) {
      setSizeError(true);
      return;
    }
    if (soldOut || adding) return;

    setSizeError(false);
    setAdding(true);
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: effectivePrice(product),
      compareAtPrice: product.compareAtPrice,
      imageUrl: primaryImage(product)?.url ?? null,
      size,
      color,
      quantity,
      maxQuantity: product.stockQuantity,
      sku: product.sku,
    });
    addTimer.current = setTimeout(() => setAdding(false), ADD_FEEDBACK_MS);

    toast.success("Added to your bag", {
      description: product.name,
      action: {
        label: "View bag",
        onClick: () => router.push("/cart"),
      },
    });
  };

  const addToBagButton = (className?: string) => {
    if (soldOut) {
      return (
        <Button
          disabled
          size="lg"
          className={cn("h-12 rounded-full", className)}
          aria-disabled="true"
        >
          Out of stock
        </Button>
      );
    }
    return (
      <Button
        size="lg"
        className={cn("h-12 rounded-full", className)}
        onClick={handleAddToCart}
        disabled={adding}
      >
        {adding ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <ShoppingBag className="size-4" aria-hidden="true" />
        )}
        {adding ? "Adding…" : "Add to bag"}
      </Button>
    );
  };

  const delivery = settings?.delivery;
  const deliveryLines: string[] = [];
  if (delivery && typeof delivery.flatFee === "number") {
    deliveryLines.push(
      delivery.freeAboveThreshold !== null && delivery.freeAboveThreshold !== undefined
        ? `Standard nationwide delivery is ${formatPrice(delivery.flatFee)} — free on orders above ${formatPrice(delivery.freeAboveThreshold)}.`
        : `Standard nationwide delivery is ${formatPrice(delivery.flatFee)}.`
    );
  }
  if (delivery?.note) {
    deliveryLines.push(delivery.note);
  }
  if (deliveryLines.length === 0) {
    deliveryLines.push(
      "Delivery is arranged personally with you when you order — we will always confirm the exact cost before dispatch."
    );
  }

  /* ---------------------------------- render ---------------------------------- */
  return (
    <div className="container-page pb-28 pt-6 lg:pb-12 lg:pt-10">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/shop">Shop</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={product.category ? `/shop/${product.category.slug}` : "/shop"}>
                {categoryName}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="max-w-[12rem] truncate font-medium sm:max-w-none">
              {product.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-14">
        <ProductGallery product={product} />

        <div className="flex flex-col">
          {product.category ? (
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
              {product.category.name}
            </p>
          ) : null}
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <ProductPrice product={product} size="lg" />
            {salePct ? (
              <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                Save {salePct}%
              </Badge>
            ) : null}
            <StockBadge product={product} />
          </div>

          <Separator className="my-5" />

          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            {product.description}
          </p>

          {lowStock && !soldOut ? (
            <p
              className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
              role="status"
            >
              Only {product.stockQuantity} left — order soon
            </p>
          ) : null}

          {/* Size */}
          {product.sizes.length > 0 ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Size
                </p>
                {sizeError ? (
                  <p className="text-xs font-medium text-destructive" role="alert">
                    Please select a size
                  </p>
                ) : null}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Select size">
                {product.sizes.map((option) => {
                  const selected = size === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        setSize(option);
                        setSizeError(false);
                      }}
                      className={cn(
                        "min-w-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-foreground hover:border-primary/50 hover:bg-secondary"
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Colour */}
          {product.colors.length > 0 ? (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Colour
                {color ? (
                  <span className="ml-2 text-xs font-medium normal-case tracking-normal text-foreground">
                    {color}
                  </span>
                ) : null}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2.5" role="group" aria-label="Select colour">
                {product.colors.map((option) => {
                  const selected = color === option.name;
                  return (
                    <button
                      key={option.name}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`Colour ${option.name}`}
                      title={option.name}
                      onClick={() => setColor(selected ? null : option.name)}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        selected
                          ? "border-primary ring-2 ring-primary ring-offset-1"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span
                        className="size-6 rounded-full border border-black/10"
                        style={{ backgroundColor: option.hex }}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
                {color ? `Selected: ${color}` : "Select a colour (optional)"}
              </p>
            </div>
          ) : null}

          {/* Quantity + actions */}
          {!soldOut ? (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Quantity
              </p>
              <QuantityInput
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={Math.max(1, product.stockQuantity)}
                disabled={soldOut}
                aria-label="Quantity"
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {soldOut ? (
              <>
                {addToBagButton("flex-1 sm:flex-none sm:px-10")}
                <WhatsAppButton
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full"
                  label="Ask about restock"
                  message={restockMessage}
                />
              </>
            ) : (
              <>
                {addToBagButton("flex-1 sm:flex-none sm:px-10")}
                <WhatsAppButton
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-full"
                  label="Order via WhatsApp"
                  message={enquiryMessage}
                />
              </>
            )}
          </div>

          {/* Details accordions */}
          <div className="mt-8">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="delivery">
                <AccordionTrigger>Delivery &amp; Returns</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                    {deliveryLines.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                    <p>
                      If a piece is not right, contact us within 48 hours of delivery and we will
                      gladly arrange an exchange or refund.
                    </p>
                    <Link
                      href="/shipping"
                      className="inline-block font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Read full shipping details
                    </Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="fabric">
                <AccordionTrigger>Fabric &amp; Care</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
                    <p>
                      Every piece is chosen for fabric that feels as good as it looks — soft to
                      wear, easy to move in and made to last beyond the season.
                    </p>
                    <p>
                      To keep it looking its best: wash gently in cold water with like colours,
                      avoid bleach, iron on low heat on the reverse side, and hang or lay flat to
                      dry. When in doubt, follow the care instructions on the garment label.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      {/* Related pieces */}
      {related.length > 0 ? (
        <section className="mt-16 lg:mt-24" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
          >
            You may also love
          </h2>
          <div className="mt-6">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}

      {/* Mobile sticky purchase bar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden"
        role="region"
        aria-label="Quick purchase"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0">
            <ProductPrice product={product} size="md" />
            {sizeError ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                Please select a size
              </p>
            ) : null}
          </div>
          <div className="ml-auto shrink-0">
            {addToBagButton("px-6")}
          </div>
        </div>
      </div>
    </div>
  );
}
