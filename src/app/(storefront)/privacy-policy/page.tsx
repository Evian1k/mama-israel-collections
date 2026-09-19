import type { Metadata } from "next";
import Link from "next/link";
import { storeConfig } from "@/config/store";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${storeConfig.name} collects, uses and protects your information — written plainly and honestly.`,
};

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-semibold text-foreground sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm italic text-muted-foreground">
          This policy will be dated when finalised by the business.
        </p>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          Your trust matters to us. This policy explains, in plain language, what
          information we collect when you shop with us or get in touch, how we use
          it, and the choices you have. The short version: we only ask for what we
          need to serve you well, and we never sell your information.
        </p>
      </header>

      <section aria-labelledby="pp-overview">
        <h2 id="pp-overview" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Overview
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          {storeConfig.name} is a small, personal business. When you place an
          order or send us a message, we handle your details the way we would want
          our own handled — carefully, privately and only for the purpose you
          shared them for. This policy applies to this website and to the
          conversations we have with you about your orders.
        </p>
      </section>

      <section aria-labelledby="pp-collect">
        <h2 id="pp-collect" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Information We Collect
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We collect only the details needed to serve you:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>
            <strong className="font-medium text-foreground">Order details</strong>{" "}
            — your name, phone number, email address and delivery location, so we
            can confirm and deliver your order.
          </li>
          <li>
            <strong className="font-medium text-foreground">Contact messages</strong>{" "}
            — the name, email, phone number (optional) and message you share when
            you write to us through the contact form.
          </li>
        </ul>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          We do not collect card or mobile-money details on this website —
          payments currently happen on delivery, so there is nothing financial
          for us to hold.
        </p>
      </section>

      <section aria-labelledby="pp-use">
        <h2 id="pp-use" className="mt-12 font-display text-2xl font-semibold text-foreground">
          How We Use Your Information
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>To process your orders and arrange their delivery.</li>
          <li>To respond to your questions and follow up on your requests.</li>
          <li>To keep accurate records of orders and conversations, so nothing gets lost between us.</li>
          <li>To improve our service, based on honest feedback from customers like you.</li>
        </ul>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          We do not sell or rent your personal information to anyone.
        </p>
      </section>

      <section aria-labelledby="pp-sharing">
        <h2 id="pp-sharing" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Data Sharing
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We share your information only when it is necessary to serve you, and
          only the minimum needed:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>
            <strong className="font-medium text-foreground">Delivery partners</strong>{" "}
            — your name, phone number and delivery location, so your order reaches
            you safely.
          </li>
          <li>
            <strong className="font-medium text-foreground">WhatsApp communication</strong>{" "}
            — if you choose to chat with us on WhatsApp, those conversations are
            handled there and are also covered by WhatsApp&apos;s own privacy
            terms.
          </li>
        </ul>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Beyond that, your details stay with us.
        </p>
      </section>

      <section aria-labelledby="pp-storage">
        <h2 id="pp-storage" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Data Storage &amp; Security
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Your details are stored securely and are accessible only to the people
          who need them to run the store — for example, to confirm an order or
          reply to your message. We keep access limited, keep our systems up to
          date, and treat your information with the same care we would want for
          our own.
        </p>
      </section>

      <section aria-labelledby="pp-cookies">
        <h2 id="pp-cookies" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Cookies &amp; Local Storage
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          This website does not run advertising or tracking cookies. A few
          practical things — like your shopping cart and your preferences — are
          stored on <em>your own device</em> using your browser&apos;s local
          storage. They never leave your device unless you place an order, and
          you can clear them at any time from your browser settings.
        </p>
      </section>

      <section aria-labelledby="pp-rights">
        <h2 id="pp-rights" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Your Rights
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          You can ask to see the personal information we hold about you, ask us
          to correct anything that is wrong, or ask us to delete it. Just reach
          us through the{" "}
          <Link
            href="/contact"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            contact page
          </Link>{" "}
          and we will take care of it personally.
        </p>
      </section>

      <section aria-labelledby="pp-retention">
        <h2 id="pp-retention" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Data Retention
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          We keep order and message records only as long as we reasonably need
          them — to serve you well, meet our record-keeping needs and resolve any
          follow-up questions. When we no longer need your information, we delete
          it.
        </p>
      </section>

      <section aria-labelledby="pp-changes">
        <h2 id="pp-changes" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Changes to This Policy
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          If we update this policy, the new version will be published on this
          page. If a change is significant, we will make it clear on the site so
          you always know where you stand.
        </p>
      </section>

      <section aria-labelledby="pp-contact">
        <h2 id="pp-contact" className="mt-12 font-display text-2xl font-semibold text-foreground">
          Contact
        </h2>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          Questions about this policy, or about the information we hold? We would
          love to hear from you — visit the{" "}
          <Link
            href="/contact"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            contact page
          </Link>{" "}
          and send us a message.
        </p>
      </section>
    </article>
  );
}
