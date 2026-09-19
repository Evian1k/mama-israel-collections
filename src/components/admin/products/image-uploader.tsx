"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Star,
  Type,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSession } from "@/hooks/admin/use-admin-stats";
import { uploadImages } from "@/services/api/admin/uploads";
import { cn } from "@/lib/utils";
import type { ProductFormImage } from "./product-form-schema";

/**
 * Controlled product-image manager:
 * drag & drop / browse → client validation → upload with progress →
 * reorderable grid with a single primary image, alt-text editing and removal.
 *
 * Value shape mirrors the API: Array<Omit<ProductImage, "id">>.
 */

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const ACCEPT = ".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif";

interface ImageUploaderProps {
  value: ProductFormImage[];
  onChange: (next: ProductFormImage[]) => void;
  disabled?: boolean;
}

/** Keeps the list canonical: compact sortOrders + exactly one primary */
function normalize(list: ProductFormImage[]): ProductFormImage[] {
  const hasPrimary = list.some((img) => img.isPrimary);
  return list.map((img, index) => ({
    ...img,
    isPrimary: hasPrimary ? img.isPrimary : index === 0,
    sortOrder: index,
  }));
}

export function ImageUploader({ value, onChange, disabled = false }: ImageUploaderProps) {
  const { token } = useAdminSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const images = value;

  const handleFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    // Reset the input so picking the same file again still fires change
    if (inputRef.current) inputRef.current.value = "";

    if (files.length === 0 || uploading || disabled) return;

    const rejected: string[] = [];
    const valid: File[] = [];
    let capacity = MAX_IMAGES - images.length;

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) {
        rejected.push(`"${file.name}" is not a supported image (use JPG, PNG, WebP or AVIF).`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        rejected.push(`"${file.name}" is larger than 5MB. Please compress it first.`);
        continue;
      }
      if (capacity <= 0) {
        rejected.push(`"${file.name}" skipped — a product can have at most ${MAX_IMAGES} images.`);
        continue;
      }
      valid.push(file);
      capacity -= 1;
    }

    setErrors(rejected);
    if (valid.length === 0) return;

    if (!token) {
      toast.error("Your session expired — please sign in again.");
      return;
    }

    setUploading(true);
    setProgress(0);
    uploadImages(valid, token, { onProgress: setProgress })
      .then((result) => {
        const appended: ProductFormImage[] = result.images.map((img, index) => ({
          url: img.url,
          alt: "",
          isPrimary: false,
          sortOrder: images.length + index,
        }));
        onChange(normalize([...images, ...appended]));
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error && error.message
            ? error.message
            : "Upload failed. Please try again.";
        toast.error(message);
      })
      .finally(() => {
        setUploading(false);
        setProgress(0);
      });
  };

  const setPrimary = (index: number) => {
    const item = images[index];
    if (!item || item.isPrimary) return;
    // The primary image always moves to the front of the gallery
    onChange(
      [
        { ...item, isPrimary: true },
        ...images.filter((_, i) => i !== index).map((img) => ({ ...img, isPrimary: false })),
      ].map((img, i) => ({ ...img, sortOrder: i }))
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(normalize(next));
  };

  const remove = (index: number) => {
    // normalize() promotes the first image when the primary was removed
    onChange(normalize(images.filter((_, i) => i !== index)));
  };

  const setAlt = (index: number, alt: string) => {
    onChange(images.map((img, i) => (i === index ? { ...img, alt } : img)));
  };

  return (
    <div className="space-y-4">
      {/* ------------------------------ drop zone ------------------------------ */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload product images — drag and drop or click to browse"
        aria-disabled={uploading || disabled}
        onClick={() => !uploading && !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if ((event.key === "Enter" || event.key === " ") && !uploading && !disabled) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!uploading && !disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-secondary/40 px-6 py-8 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dragActive && "border-primary bg-gold-soft/40",
          (uploading || disabled) && "pointer-events-none opacity-60"
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-background text-primary shadow-xs">
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadCloud className="size-5" aria-hidden="true" />
          )}
        </span>
        <p className="text-sm font-medium text-foreground">
          {uploading ? "Uploading your photos…" : "Drag & drop photos here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WebP or AVIF · up to 5MB each · {images.length}/{MAX_IMAGES} images
        </p>
        {uploading ? (
          <div className="mt-2 w-full max-w-xs space-y-1">
            <Progress value={progress} aria-label="Upload progress" />
            <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
              {progress}%
            </p>
          </div>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {/* --------------------------- inline validation --------------------------- */}
      {errors.length > 0 ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3" role="alert">
          <ul className="list-inside list-disc space-y-1 text-xs text-destructive">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-7 px-2 text-xs text-muted-foreground"
            onClick={() => setErrors([])}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      {/* ------------------------------ image grid ------------------------------ */}
      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label="Product images">
          {images.map((img, index) => (
            <li key={`${img.url}-${index}`} className="group relative">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary/40">
                <Image
                  src={img.url}
                  alt={img.alt || `Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 18vw"
                  className="object-cover"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground/70 text-[10px] font-semibold text-background"
                >
                  {index + 1}
                </span>
                {img.isPrimary ? (
                  <span className="absolute left-1.5 top-8 rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                    Primary
                  </span>
                ) : null}

                {/* Image toolbar */}
                <div className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-0.5 rounded-md bg-foreground/70 p-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-sm text-background hover:bg-background/20 hover:text-background"
                    aria-label={img.isPrimary ? `${img.alt || `Image ${index + 1}`} is the primary image` : `Set image ${index + 1} as primary`}
                    aria-pressed={img.isPrimary}
                    disabled={uploading || disabled}
                    onClick={() => setPrimary(index)}
                  >
                    <Star className={cn("size-3.5", img.isPrimary && "fill-gold text-gold")} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-sm text-background hover:bg-background/20 hover:text-background"
                    aria-label={`Move image ${index + 1} earlier`}
                    disabled={uploading || disabled || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ChevronLeft className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-sm text-background hover:bg-background/20 hover:text-background"
                    aria-label={`Move image ${index + 1} later`}
                    disabled={uploading || disabled || index === images.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ChevronRight className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-6 rounded-sm text-background hover:bg-background/20 hover:text-background"
                        aria-label={`Edit alt text for image ${index + 1}`}
                        disabled={uploading || disabled}
                      >
                        <Type className="size-3.5" aria-hidden="true" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <Label htmlFor={`image-alt-${index}`} className="text-xs font-medium">
                        Alt text
                      </Label>
                      <Input
                        id={`image-alt-${index}`}
                        value={img.alt}
                        maxLength={200}
                        placeholder="Describe this photo"
                        className="mt-1.5 h-8 text-xs"
                        onChange={(event) => setAlt(index, event.target.value)}
                      />
                      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                        Saved as you type. Describe the piece for screen readers and search.
                      </p>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6 rounded-sm text-background hover:bg-destructive/80 hover:text-white"
                    aria-label={`Remove image ${index + 1}`}
                    disabled={uploading || disabled}
                    onClick={() => remove(index)}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}

          {/* Upload-in-progress placeholder */}
          {uploading ? (
            <li aria-hidden="true">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary/40">
                <Skeleton className="absolute inset-0" />
                <ImagePlus className="relative size-5 animate-pulse text-muted-foreground" />
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Images are stored by the shop&apos;s image service and attached when you publish —
        they stay available across restarts and updates.
      </p>
    </div>
  );
}
