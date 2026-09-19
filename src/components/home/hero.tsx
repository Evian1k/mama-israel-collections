"use client";

import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Heart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { storeConfig } from "@/config/store";

/** Trust markers shown beneath the hero CTAs (presentational, not claims) */
const TRUST_ITEMS = [
  { icon: BadgeCheck, label: "Quality fabrics" },
  { icon: Truck, label: "Countrywide delivery" },
  { icon: Heart, label: "Personal service" },
] as const;

/**
 * Split editorial hero — brand copy on the left, framed campaign image on the
 * right. Stacks naturally on mobile (copy first, image after). The WhatsApp
 * button renders nothing while the WhatsApp number is unconfigured.
 */
export function Hero() {
  const hero = storeConfig.content.hero;

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* Soft decorative glows — purely ornamental */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-32 size-96 rounded-full bg-gold-soft/50 blur-3xl" />
        <div className="absolute -left-24 bottom-0 size-80 rounded-full bg-secondary/70 blur-3xl" />
      </div>

      <div className="container-page relative">
        <div className="grid items-center gap-12 py-14 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          {/* Copy */}
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em] text-gold">
              {hero.eyebrow}
            </p>
            <h1
              id="hero-heading"
              className="font-display text-4xl font-semibold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl"
            >
              {hero.headline}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {hero.subheadline}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-8 text-base shadow-md shadow-primary/20"
              >
                <Link href={hero.primaryCta.href}>{hero.primaryCta.label}</Link>
              </Button>
              <WhatsAppButton
                variant="outline"
                size="lg"
                label={hero.secondaryCta.label}
                message={`Hello ${storeConfig.name}! 👋 I saw your collection online.`}
                className="h-12 rounded-full px-8 text-base"
              />
            </div>

            {/* Trust row */}
            <ul className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6">
              {TRUST_ITEMS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                >
                  <Icon className="size-4 text-gold" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Framed campaign image with offset gold border decoration */}
          <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border-2 border-gold/40 sm:translate-x-5 sm:translate-y-5"
            />
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-secondary shadow-xl shadow-wine/10">
              <Image
                src="/images/hero.png"
                alt={hero.imageAlt}
                fill
                priority
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 42vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
