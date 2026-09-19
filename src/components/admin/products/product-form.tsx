"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminProductMutations } from "@/hooks/admin/use-admin-data";
import { ApiError } from "@/services/api/client";
import { formatPrice } from "@/lib/format";
import type { Category, CreateProductInput, Product } from "@/types";

import { ImageUploader } from "./image-uploader";
import {
  productFormSchema,
  slugify,
  type ProductFormInput,
} from "./product-form-schema";
import { ColorEditor, SizeEditor } from "./variant-editors";

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initial?: Product;
  categories: Category[];
}

function buildDefaultValues(mode: ProductFormProps["mode"], initial?: Product): ProductFormInput {
  if (mode === "edit" && initial) {
    return {
      name: initial.name,
      slug: initial.slug,
      description: initial.description,
      categoryId: initial.categoryId,
      price: String(initial.price),
      onSale: initial.compareAtPrice != null,
      compareAtPrice: initial.compareAtPrice != null ? String(initial.compareAtPrice) : "",
      sku: initial.sku ?? "",
      images: initial.images.map(({ url, alt, isPrimary, sortOrder }) => ({
        url,
        alt,
        isPrimary,
        sortOrder,
      })),
      sizes: [...initial.sizes],
      colors: initial.colors.map((color) => ({ ...color })),
      stockQuantity: String(initial.stockQuantity),
      lowStockThreshold: String(initial.lowStockThreshold),
      isFeatured: initial.isFeatured,
      isNewArrival: initial.isNewArrival,
      isActive: initial.isActive,
    };
  }
  return {
    name: "",
    slug: "",
    description: "",
    categoryId: "",
    price: "",
    onSale: false,
    compareAtPrice: "",
    sku: "",
    images: [],
    sizes: [],
    colors: [],
    stockQuantity: "0",
    lowStockThreshold: "3",
    isFeatured: false,
    isNewArrival: true,
    isActive: true,
  };
}

function parseAmount(raw: string | number | undefined): number {
  const parsed = Number(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Create / edit product form shared by /admin/products/new and
 * /admin/products/[id]/edit. Sections follow the catalogue flow:
 * basics → pricing → variants → inventory → images → visibility.
 */
export function ProductForm({ mode, productId, initial, categories }: ProductFormProps) {
  const router = useRouter();
  const { create, update } = useAdminProductMutations();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    mode: "onTouched",
    defaultValues: buildDefaultValues(mode, initial),
  });

  /* Watched values for live previews and conditional sections */
  const nameValue = form.watch("name") ?? "";
  const slugValue = form.watch("slug") ?? "";
  const onSale = form.watch("onSale");
  const priceRaw = form.watch("price");
  const compareRaw = form.watch("compareAtPrice");
  const descriptionValue = form.watch("description") ?? "";
  const stockRaw = form.watch("stockQuantity") ?? "";
  const sizesValue = form.watch("sizes") ?? [];
  const colorsValue = form.watch("colors") ?? [];
  const imagesValue = form.watch("images") ?? [];

  const slugPreview = slugTouched ? slugValue || slugify(nameValue) : slugify(nameValue);

  const priceNum = parseAmount(priceRaw);
  const compareNum = parseAmount(compareRaw);
  const showDiscount =
    onSale &&
    Number.isFinite(priceNum) &&
    priceNum > 0 &&
    Number.isFinite(compareNum) &&
    compareNum > 0 &&
    compareNum < priceNum;

  const stockNum = parseAmount(stockRaw);
  const showOutOfStockNote = Number.isFinite(stockNum) && stockNum === 0;

  const pending = create.isPending || update.isPending;
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(
    (values: ProductFormInput) => {
      setSubmitError(null);

      const payload: CreateProductInput = {
        name: values.name,
        slug: values.slug,
        description: values.description,
        categoryId: values.categoryId,
        price: Number(values.price),
        compareAtPrice:
          values.onSale && values.compareAtPrice !== "" ? Number(values.compareAtPrice) : null,
        sku: values.sku,
        images: values.images,
        sizes: values.sizes,
        colors: values.colors,
        stockQuantity: Number(values.stockQuantity),
        lowStockThreshold: Number(values.lowStockThreshold),
        isFeatured: values.isFeatured,
        isNewArrival: values.isNewArrival,
        isActive: values.isActive,
      };

      const request =
        mode === "create"
          ? create.mutateAsync(payload)
          : update.mutateAsync({ id: productId!, input: payload });

      request
        .then(() => {
          toast.success(mode === "create" ? "Product created" : "Product updated");
          router.push("/admin/products");
        })
        .catch((error: unknown) => {
          const message =
            error instanceof ApiError && error.message
              ? error.message
              : "We could not save this product. Please try again.";
          setSubmitError(message);
          toast.error(message);
        });
    },
    () => {
      setSubmitError("Please fix the highlighted fields before saving.");
    }
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate>
        {submitError ? (
          <Alert variant="destructive" className="mb-6" role="alert">
            <AlertTriangle className="size-4" aria-hidden="true" />
            <AlertTitle>We could not save this product</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        {categories.length === 0 ? (
          <Alert className="mb-6">
            <Info className="size-4" aria-hidden="true" />
            <AlertTitle>No categories yet</AlertTitle>
            <AlertDescription>
              Every product needs a category.{" "}
              <Link href="/admin/categories" className="font-medium underline underline-offset-4">
                Create a category first
              </Link>
              .
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="mx-auto max-w-3xl space-y-6">
          {/* ------------------------------- Basics ------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Basics</CardTitle>
              <CardDescription>The details shoppers see first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Burgundy Ankara Wrap Dress"
                        autoComplete="off"
                        value={field.value}
                        onChange={(event) => {
                          field.onChange(event.target.value);
                          if (!slugTouched) {
                            form.setValue("slug", slugify(event.target.value));
                          }
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormDescription>
                      Store URL:{" "}
                      <span className="font-mono">
                        /products/{slugPreview || "auto-generated-from-name"}
                      </span>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Slug</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          setSlugTouched(false);
                          form.setValue("slug", slugify(nameValue));
                        }}
                      >
                        <RefreshCw className="size-3" aria-hidden="true" />
                        Regenerate from name
                      </Button>
                    </div>
                    <FormControl>
                      <Input
                        value={field.value ?? ""}
                        placeholder="auto-generated-from-name"
                        autoComplete="off"
                        className="font-mono text-xs"
                        onChange={(event) => {
                          setSlugTouched(true);
                          field.onChange(event.target.value);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormDescription>
                      Leave as generated, or edit for a shorter link. Lowercase letters, numbers
                      and hyphens only.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>Description</FormLabel>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {field.value.length}/5000
                      </span>
                    </div>
                    <FormControl>
                      <Textarea
                        rows={6}
                        maxLength={5000}
                        placeholder="Describe the fabric, fit and feel — this is what shoppers read on the product page."
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                            {category.isActive ? "" : " (inactive)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Auto-generated when left empty, e.g. MIC-0007"
                        autoComplete="off"
                        className="max-w-60 font-mono text-xs"
                        value={field.value ?? ""}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ------------------------------- Pricing ------------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
              <CardDescription>
                Prices are in Kenyan shillings (KSh).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (KSh)</FormLabel>
                    <FormControl>
                      <Input
                        inputMode="decimal"
                        placeholder="e.g. 4500"
                        className="max-w-60"
                        value={field.value}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                        name={field.name}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="onSale"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="font-medium">On sale</FormLabel>
                      <FormDescription>
                        Show a struck-through original price next to the sale price.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Product is on sale"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {onSale ? (
                <FormField
                  control={form.control}
                  name="compareAtPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale price (KSh)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          placeholder="Original price, e.g. 5500"
                          className="max-w-60"
                          value={field.value ?? ""}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      {showDiscount ? (
                        <FormDescription className="text-emerald-700">
                          Shoppers pay {formatPrice(compareNum)} — save{" "}
                          {Math.round(((priceNum - compareNum) / priceNum) * 100)}%
                        </FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </CardContent>
          </Card>

          {/* ------------------------------- Variants ----------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Variants</CardTitle>
              <CardDescription>
                Sizes and colours shoppers can choose from. Optional — leave empty for
                one-size pieces.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium leading-none text-foreground">Sizes</p>
                <SizeEditor
                  value={sizesValue}
                  onChange={(next) => form.setValue("sizes", next, { shouldValidate: true })}
                  disabled={pending}
                />
                {errors.sizes?.message ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.sizes.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium leading-none text-foreground">Colours</p>
                <ColorEditor
                  value={colorsValue}
                  onChange={(next) => form.setValue("colors", next, { shouldValidate: true })}
                  disabled={pending}
                />
                {errors.colors?.message ? (
                  <p className="text-sm text-destructive" role="alert">
                    {errors.colors.message}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* ------------------------------ Inventory ----------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
              <CardDescription>Track what is on the shelf.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="max-w-40"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low-stock alert at</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          className="max-w-40"
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                        />
                      </FormControl>
                      <FormDescription>
                        Shoppers see an “only N left” note at or below this.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {showOutOfStockNote ? (
                <p className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <Info className="size-4 shrink-0" aria-hidden="true" />
                  This product will show as out of stock.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* -------------------------------- Images ------------------------------ */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                The first image is the cover photo. Star an image to make it primary.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUploader
                value={imagesValue}
                onChange={(next) => form.setValue("images", next, { shouldValidate: true })}
                disabled={pending}
              />
              {errors.images?.message ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.images.message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* --------------------------- Visibility & flags ----------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>Visibility &amp; flags</CardTitle>
              <CardDescription>Control where this piece appears.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="font-medium">Active</FormLabel>
                      <FormDescription>
                        Visible in the store. Turn off to hide this piece without deleting it.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Product is active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="font-medium">Featured</FormLabel>
                      <FormDescription>
                        Highlighted in the Featured Collection on the home page.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Product is featured"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isNewArrival"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border border-border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="font-medium">New arrival</FormLabel>
                      <FormDescription>Shows in the New Arrivals section.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Product is a new arrival"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ------------------------------ Submit bar ----------------------------- */}
          <div className="sticky bottom-0 -mx-4 mt-8 flex items-center justify-end gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:-mx-8 lg:px-8">
            <Button asChild type="button" variant="ghost" disabled={pending}>
              <Link href="/admin/products">Cancel</Link>
            </Button>
            <Button type="submit" className="min-w-32 rounded-full" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {mode === "create" ? "Save product" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
