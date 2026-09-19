import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MapPin, MessageCircle, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { storeApi } from "@/services/api/store";
import type { StoreSettings } from "@/types";
import { storeConfig } from "@/config/store";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shipping & Delivery",
  description: `Where ${storeConfig.shortName} delivers, how delivery fees work, and what happens after you order — confirmed with you personally, no surprises.`,
};

/** SSR settings fetch — settings enrich the page but are never required. */
async function fetchSettings(): Promise<StoreSettings | null> {
  try {
    return await storeApi.getSettings();
  } catch {
    return null;
  }
}

const deliverySteps = [
  {
    icon: MessageCircle,
    title: "We confirm",
    description:
      "Once you place an order, we confirm it with you personally — by phone or WhatsApp — and answer any questions before anything moves.",
  },
  {
    icon: Package,
    title: "We pack",
    description:
      "Your pieces are checked one last time and packed with care, ready for the journey.",
  },
  {
    icon: Truck,
    title: "We deliver",
    description:
      "Delivery is arranged with you — we bring your order to your door or the agreed pick-up point.",
  },
] as const;

export default async function ShippingPage() {
  const settings = await fetchSettings();
  const delivery = settings?.delivery;
  const flatFee = delivery?.flatFee ?? null;
  const freeAbove = delivery?.freeAboveThreshold ?? null;
  const deliveryNote = delivery?.note?.trim() ?? "";
  const location = settings?.location?.trim() ?? "";
  const currencySymbol = settings?.currencySymbol ?? storeConfig.currency.symbol;

  return (
    <>
      {/* Header strip */}
      <section className="border-b border-border bg-secondary/50">
        <div className="container-page py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
              Delivery
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              Shipping &amp; Delivery
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              From our hands to your doorstep — here is how getting your pieces
              to you works.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page space-y-14 py-14 sm:py-16 sm:space-y-16">
        {/* Where we deliver */}
        <section aria-labelledby="delivery-areas-heading">
          <h2
            id="delivery-areas-heading"
            className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Where we deliver
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Delivery areas">
            {storeConfig.deliveryAreas.map((area) => (
              <li
                key={area}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-foreground"
              >
                {area}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            …and across Kenya on request — just ask when you order.
          </p>
        </section>

        {/* Delivery fees */}
        <section aria-labelledby="delivery-fees-heading">
          <h2
            id="delivery-fees-heading"
            className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
          >
            Delivery fees
          </h2>
          <div className="mt-5 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
            {flatFee !== null && flatFee > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground">
                  Standard delivery within our main areas
                </p>
                <p className="mt-1 font-display text-4xl font-semibold text-primary">
                  {formatPrice(flatFee, currencySymbol)}
                </p>
                {freeAbove !== null && freeAbove > 0 ? (
                  <p className="mt-4 flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-gold" aria-hidden="true" />
                    Free delivery on orders above {formatPrice(freeAbove, currencySymbol)}
                  </p>
                ) : null}
                {deliveryNote ? (
                  <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">
                    Note: {deliveryNote}
                  </p>
                ) : null}
              </div>
            ) : (
              <div>
                <p className="max-w-xl leading-relaxed text-muted-foreground">
                  Delivery fees are confirmed with you before we dispatch — no
                  surprises. The cost depends on where you are, and we always
                  agree on the total together when we confirm your order.
                </p>
                {deliveryNote ? (
                  <p className="mt-4 text-sm italic leading-relaxed text-muted-foreground">
                    Note: {deliveryNote}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {/* How delivery works */}
        <section aria-labelledby="how-delivery-works-heading">
          <h2
            id="how-delivery-works-heading"
            className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
          >
            How delivery works
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3 lg:gap-6">
            {deliverySteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className="font-display text-3xl font-semibold leading-none text-gold"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
                    <step.icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Pickup — only when a location is configured */}
        {location ? (
          <section aria-labelledby="pickup-heading">
            <h2
              id="pickup-heading"
              className="font-display text-2xl font-semibold text-foreground sm:text-3xl"
            >
              Prefer to pick up?
            </h2>
            <div className="mt-5 flex items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <p className="leading-relaxed text-muted-foreground">
                You are welcome to collect your order yourself. We are based in{" "}
                <strong className="font-medium text-foreground">{location}</strong>{" "}
                — contact us after you order and we will arrange a pickup time
                that suits you.
              </p>
            </div>
          </section>
        ) : null}

        {/* Questions CTA */}
        <section>
          <div className="rounded-3xl bg-secondary px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">
              Questions about delivery?
            </h2>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-secondary-foreground/80">
              We are happy to help — reach out any time and we will sort out the
              details together.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <WhatsAppButton className="rounded-full" />
              <Button asChild variant="outline" size="lg" className="rounded-full bg-transparent">
                <Link href="/contact">Send us a message</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
