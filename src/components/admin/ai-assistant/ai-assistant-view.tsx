"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { AiDraftCard } from "@/components/admin/ai-assistant/ai-draft-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAdminCategories } from "@/hooks/admin/use-admin-data";
import { useAiAssistantParse } from "@/hooks/admin/use-ai-assistant";
import { ImageUploader } from "@/components/admin/products/image-uploader";
import type { AiProductDraft } from "@/types";
import type { ProductFormImage } from "@/components/admin/products/product-form-schema";

interface PublishedEntry {
  name: string;
  slug: string;
  active: boolean;
}

/**
 * AI Product Assistant — the owner describes clothing in plain language,
 * the assistant organises it into reviewable drafts, and publishing goes
 * through the exact same admin products API as the manual form.
 * One AI call per "Create Product" click — nothing runs in the background.
 */

const PLACEHOLDER =
  "Describe the clothing you want to add…\n\nExample: \"Add a black Ankara dress. Price is KSh 3,500. Sizes M, L and XL. Available in black and red. Put it under Dresses. It's currently in stock.\"";

export function AiAssistantView() {
  const categoriesQuery = useAdminCategories();
  const parse = useAiAssistantParse();

  const [text, setText] = useState("");
  const [composeImages, setComposeImages] = useState<ProductFormImage[]>([]);
  const [drafts, setDrafts] = useState<AiProductDraft[]>([]);
  const [notes, setNotes] = useState<string | null>(null);
  const [visualNotes, setVisualNotes] = useState<string[]>([]);
  const [published, setPublished] = useState<PublishedEntry[]>([]);

  const categories = (categoriesQuery.data ?? []).map((c) => ({ id: c.id, name: c.name }));

  const handleCreate = async () => {
    if (text.trim().length < 3) return;
    try {
      const result = await parse.mutateAsync({
        text: text.trim(),
        imageUrls: composeImages.map((img) => img.url),
      });
      setDrafts((current) => [...current, ...result.products]);
      setNotes(result.notes);
      setVisualNotes(result.visualNotes);
      setText("");
      setComposeImages([]);
      requestAnimationFrame(() => {
        document.getElementById("ai-drafts")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      // Error surface is handled below via parse.isError
    }
  };

  const handleChange = (draftId: string, patch: Partial<AiProductDraft>) => {
    setDrafts((current) =>
      current.map((draft) => (draft.draftId === draftId ? { ...draft, ...patch } : draft))
    );
  };

  const handleRemove = (draftId: string) => {
    setDrafts((current) => current.filter((draft) => draft.draftId !== draftId));
  };

  const handleSettled = (draftId: string, active: boolean, productName: string, slug: string) => {
    setDrafts((current) => current.filter((draft) => draft.draftId !== draftId));
    setPublished((current) => [{ name: productName, slug, active }, ...current]);
  };
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="AI Product Assistant"
        description="Describe a product in your own words — the assistant organises the details, you review, then publish. It never invents information and never publishes without your confirmation."
      />

      {/* ------------------------------ compose ------------------------------ */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="ai-compose-heading">
        <h2 id="ai-compose-heading" className="font-display text-lg font-bold text-foreground">
          What would you like to add?
        </h2>
        <div className="mt-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="ai-description" className="sr-only">
              Product description
            </Label>
            <Textarea
              id="ai-description"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLACEHOLDER}
              rows={6}
              maxLength={4000}
              className="min-h-32 text-base leading-relaxed"
              disabled={parse.isPending}
            />
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Camera className="size-4 text-gold" aria-hidden="true" />
              Upload product photos
              <span className="text-xs font-normal text-muted-foreground">(optional — added to the product)</span>
            </p>
            <ImageUploader value={composeImages} onChange={setComposeImages} disabled={parse.isPending} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              className="w-full gap-2 rounded-full text-base sm:w-auto"
              disabled={text.trim().length < 3 || parse.isPending}
              onClick={() => void handleCreate()}
            >
              {parse.isPending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-5 text-gold" aria-hidden="true" />
              )}
              {parse.isPending ? "Reading your description…" : "Create Product"}
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Nothing is published straight away — you always get a chance to review and edit first.
            </p>
          </div>

          {parse.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Couldn&apos;t prepare that</AlertTitle>
              <AlertDescription>
                {parse.error instanceof Error ? parse.error.message : "Please try again."}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </section>

      {/* ------------------------- published successes ------------------------- */}
      {published.length > 0 ? (
        <section className="mt-6 space-y-2" aria-label="Recently added products">
          {published.map((entry) => (
            <div
              key={`${entry.slug}-${entry.name}`}
              className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                {entry.active ? "Published" : "Saved as draft"}: {entry.name}
              </p>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                <Link
                  href="/admin/products"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  View in Products <ExternalLink className="size-3" aria-hidden="true" />
                </Link>
                {entry.active ? (
                  <Link
                    href={`/products/${entry.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    View in shop <ExternalLink className="size-3" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {/* -------------------------------- drafts -------------------------------- */}
      <div id="ai-drafts" className="mt-6 scroll-mt-20">
        {parse.isPending ? (
          <div
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Organising your details… this usually takes a few seconds.
          </div>
        ) : null}

        {notes && !parse.isPending ? (
          <Alert className="border-primary/25 bg-secondary/50">
            <Sparkles className="size-4 !text-gold" aria-hidden="true" />
            <AlertTitle>Assistant</AlertTitle>
            <AlertDescription className="text-foreground/90">
              {notes}
              {visualNotes.length > 0 ? (
                <span className="mt-1 block text-xs italic text-muted-foreground">
                  From your photo: {visualNotes.join("; ")}.
                </span>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        {drafts.length > 0 ? (
          <>
            <h2 className="mb-3 mt-6 font-display text-lg font-bold text-foreground">
              Review {drafts.length === 1 ? "product" : `${drafts.length} products`}
            </h2>
            <ul className="space-y-5">
              {drafts.map((draft) => (
                <AiDraftCard
                  key={draft.draftId}
                  draft={draft}
                  categories={categories}
                  onChange={handleChange}
                  onRemove={handleRemove}
                  onSettled={handleSettled}
                />
              ))}
            </ul>
          </>
        ) : !parse.isPending && notes === null ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-secondary/30 px-4 py-8 text-center">
            <Sparkles className="mx-auto size-6 text-gold" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-foreground">Your drafted products will appear here</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Try: &ldquo;Blue floral dress, 3,000 shillings, sizes S to XL, put it in Dresses.&rdquo;
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
