"use client";

import { Heart, MessageCircle, Sparkles, Truck, type LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { storeConfig } from "@/config/store";

/** Maps config icon keys to lucide icons (safe fallback keeps cards intact) */
const VALUE_ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  heart: Heart,
  truck: Truck,
  "message-circle": MessageCircle,
};

/** "Why Shop With Us" — the four value cards from the store configuration */
export function WhyShop() {
  const values = storeConfig.content.whyShopWithUs;

  return (
    <section aria-labelledby="why-shop-heading" className="container-page py-16 lg:py-24">
      <SectionHeading
        eyebrow="The Mama Israel promise"
        title="Why Shop With Us"
        description="A small boutique with a big standard of care — here is what you can always expect from us."
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-6">
        {values.map((value) => {
          const Icon = VALUE_ICONS[value.icon] ?? Sparkles;
          return (
            <div
              key={value.title}
              className="rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-gold-soft text-gold">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
