import type { Metadata } from "next";
import Link from "next/link";
import { storeConfig } from "@/config/store";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that keep things clear and fair when you shop with ${storeConfig.name}.`,
};

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-4 text-sm italic text-muted-foreground">
          These terms will be dated when finalised by the business.
        </p>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          These terms exist to keep things clear and fair for both of us. We have
          written them in plain language — if anything is unclear, please ask us
          before you order and we will happily explain.
        </p>
      </header>

      <section aria-labelledby="tc-agreement">
        <h2 id="tc-agreement" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Agreement to Terms
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          By browsing this website or placing an order with {storeConfig.name},
          you agree to these terms. They apply to every order placed through this
          website or directly with us by phone or WhatsApp.
        </p>
      </section>

      <section aria-labelledby="tc-products">
        <h2 id="tc-products" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Products &amp; Availability
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Every piece in our collection is hand-curated, and we only list what we
          can actually deliver. That said, stock changes quickly — especially for
          single, one-of-a-kind pieces. If an item sells out after you have
          ordered, we will contact you personally to arrange an alternative or a
          full refund.
        </p>
      </section>

      <section aria-labelledby="tc-pricing">
        <h2 id="tc-pricing" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Pricing &amp; Currency
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          All prices are shown in Kenyan Shillings (KES). The total confirmed by
          our team when you order — including any delivery fee — is the amount
          you pay. In the rare case of a pricing error, we will contact you to
          confirm the correct amount before anything proceeds.
        </p>
      </section>

      <section aria-labelledby="tc-ordering">
        <h2 id="tc-ordering" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Ordering
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          You can order directly through this website, or by chatting with us.
          Once we receive your order, we confirm availability, your delivery
          details and the total with you personally — by phone or WhatsApp —
          before dispatch. An order is final when we have both agreed on those
          details.
        </p>
      </section>

      <section aria-labelledby="tc-payment">
        <h2 id="tc-payment" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Payment
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          For now, we take payment on delivery — you pay when your order arrives
          in your hands. Mobile money (M-Pesa) and card payments are planned for
          the future, and we will announce them clearly on this website when they
          become available. We will never ask you for card details on this
          website.
        </p>
      </section>

      <section aria-labelledby="tc-delivery">
        <h2 id="tc-delivery" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Delivery
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We deliver across Kenya — see our{" "}
          <Link
            href="/shipping"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Shipping &amp; Delivery
          </Link>{" "}
          page for areas, fees and how delivery works. Exact delivery timelines
          are confirmed with you personally when we confirm your order, so there
          are no surprises.
        </p>
      </section>

      <section aria-labelledby="tc-returns">
        <h2 id="tc-returns" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Returns &amp; Exchanges
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          If something is not right, we want to make it right. Items may be
          returned or exchanged within 48 hours of delivery, provided they are
          unused and in their original condition and packaging. Contact us within
          that window and we will arrange the details with you personally.
        </p>
      </section>

      <section aria-labelledby="tc-cancellations">
        <h2 id="tc-cancellations" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Cancellations
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          You can cancel an order at any time before it is dispatched — just
          message or call us. Once an order is already on its way to you, you may
          refuse it on arrival, and it will be handled as a return under our
          returns policy.
        </p>
      </section>

      <section aria-labelledby="tc-liability">
        <h2 id="tc-liability" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Liability
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We take care to describe every item accurately and to pack every order
          well. Our responsibility for any issue with an order is limited to the
          value of the items purchased. Whatever happens, we will always work
          with you in good faith to fix a genuine problem.
        </p>
      </section>

      <section aria-labelledby="tc-law">
        <h2 id="tc-law" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Governing Law
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          These terms are governed by the laws of the Republic of Kenya.
        </p>
      </section>

      <section aria-labelledby="tc-contact">
        <h2 id="tc-contact" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Contact
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Questions about these terms? Reach us through the{" "}
          <Link
            href="/contact"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            contact page
          </Link>{" "}
          — we are happy to help.
        </p>
      </section>
    </article>
  );
}
