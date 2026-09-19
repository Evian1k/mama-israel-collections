"use client";

import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { useMounted } from "@/hooks/use-mounted";
import { storeConfig } from "@/config/store";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

/**
 * Full-width burgundy WhatsApp band. The WhatsApp number is a store setting —
 * until it is configured the whole section returns null (no empty gap).
 */
export function WhatsAppCta() {
  const mounted = useMounted();
  const { data: settings, isLoading } = useStoreSettings();
  const copy = storeConfig.content.whatsappCta;

  // While loading we do not yet know — hide to avoid a section that flashes in.
  // Render only after mount so server HTML and first client render always match.
  if (!mounted || isLoading || !isWhatsAppConfigured(settings?.whatsappNumber)) return null;

  const greeting = `Hello ${settings?.name ?? storeConfig.name}! 👋 I saw your collection online and I have a question.`;

  return (
    <section aria-label={copy.title} className="container-page py-16 lg:py-24">
      <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 lg:py-20">
        {/* Radial pattern accent — purely ornamental */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-28 size-80 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.16),transparent_70%)]" />
          <div className="absolute -bottom-32 -right-20 size-96 rounded-full bg-[radial-gradient(circle,rgba(185,138,78,0.4),transparent_70%)]" />
          <div className="absolute left-1/2 top-1/2 size-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.07),transparent_60%)]" />
        </div>

        <div className="relative mx-auto max-w-2xl">
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {copy.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-primary-foreground/85">
            {copy.description}
          </p>
          <div className="mt-8 flex justify-center">
            <WhatsAppButton
              variant="secondary"
              size="lg"
              label={copy.buttonLabel}
              message={greeting}
              className="h-12 rounded-full px-8 text-base"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
