import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { storeConfig } from "@/config/store";
import { generalEnquiryMessage } from "@/lib/whatsapp";

const about = storeConfig.content.about;

export const metadata: Metadata = {
  title: "Our Story",
  description: about.intro,
  openGraph: {
    title: `Our Story | ${storeConfig.name}`,
    description: about.intro,
    images: [
      {
        url: "/images/about.png",
        width: 1152,
        height: 864,
        alt: "A glimpse inside the Mama Israel Collections boutique — curated pieces, chosen with care",
      },
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      {/* Hero strip */}
      <section className="border-b border-border bg-secondary/50">
        <div className="container-page py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
              {about.heroEyebrow}
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              {about.heroTitle}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {about.intro}
            </p>
          </div>
        </div>
      </section>

      {/* Story — image + narrative */}
      <section aria-labelledby="our-story-heading" className="container-page py-16 sm:py-20">
        <h2 id="our-story-heading" className="sr-only">
          How it began
        </h2>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            {/* Subtle gold frame decoration */}
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-gold/50 sm:translate-x-4 sm:translate-y-4"
            />
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-secondary">
              <Image
                src="/images/about.png"
                alt="Inside Mama Israel Collections — a curated rail of elegant women's clothing"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="space-y-5">
            {about.story.map((paragraph, index) => (
              <p
                key={index}
                className={
                  index === 0
                    ? "text-lg leading-relaxed text-foreground"
                    : "leading-relaxed text-muted-foreground"
                }
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section aria-labelledby="values-heading" className="container-page pb-16 sm:pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
            {storeConfig.tagline}
          </p>
          <h2 id="values-heading" className="mt-3 font-display text-3xl font-semibold text-foreground sm:text-4xl">
            What we stand for
          </h2>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {about.values.map((value, index) => (
            <article
              key={value.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
            >
              <p
                aria-hidden="true"
                className="font-display text-4xl font-semibold leading-none text-gold"
              >
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
                {value.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Closing CTA band */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="rounded-3xl bg-secondary px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
            Ready to find something you love?
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-relaxed text-secondary-foreground/80">
            Every piece in the collection is chosen with care — take a look and
            find the one that feels like you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full">
              <Link href={storeConfig.content.hero.primaryCta.href}>
                Shop the Collection
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <WhatsAppButton
              variant="outline"
              size="lg"
              className="rounded-full bg-transparent"
              message={generalEnquiryMessage(storeConfig.name)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
