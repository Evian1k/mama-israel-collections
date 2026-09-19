import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storeConfig } from "@/config/store";

export const metadata: Metadata = {
  title: "Page Not Found",
};

/**
 * Root 404 — rendered WITHOUT the storefront header/footer, so it is a
 * complete standalone page (own layout, own footer line).
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-2xl bg-primary font-display text-2xl font-semibold text-primary-foreground shadow-sm"
          >
            {storeConfig.initials}
          </span>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.22em] text-gold">
            404
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl">
            This page has wandered off
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
            The page you are looking for does not exist or may have moved. Let us
            get you back to something beautiful.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link href="/">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Home
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link href="/shop">
                <ShoppingBag className="size-4" aria-hidden="true" />
                Browse the Shop
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-4 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          {storeConfig.name} · <span className="text-gold">{storeConfig.tagline}</span>
        </p>
      </footer>
    </div>
  );
}
