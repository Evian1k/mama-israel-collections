"use client";

import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone, Twitter } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { useSecretTapNavigate } from "@/hooks/use-secret-tap-navigate";
import { storeConfig } from "@/config/store";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

/**
 * Site footer — sticks to the bottom of the viewport on short pages
 * (the storefront layout uses min-h-screen flex + flex-1 main).
 */
export function SiteFooter() {
  const { data: settings } = useStoreSettings();
  const year = new Date().getFullYear();

  // Owner gesture: five rapid taps on the brand name open the admin sign-in
  // page. Visually and semantically unchanged for regular visitors.
  const onSecretTap = useSecretTapNavigate("/admin/login");

  const hasEmail = Boolean(settings?.email);
  const hasPhone = Boolean(settings?.phone);
  const hasLocation = Boolean(settings?.location);
  const hasWhatsApp = isWhatsAppConfigured(settings?.whatsappNumber);
  const hasAnyContact = hasEmail || hasPhone || hasLocation || hasWhatsApp;

  const socials = [
    { key: "instagram", label: "Instagram", href: settings?.socialLinks.instagram, Icon: Instagram },
    { key: "facebook", label: "Facebook", href: settings?.socialLinks.facebook, Icon: Facebook },
    { key: "tiktok", label: "TikTok", href: settings?.socialLinks.tiktok, Icon: Music2 },
    { key: "twitter", label: "X (Twitter)", href: settings?.socialLinks.twitter, Icon: Twitter },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="container-page py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <button
              type="button"
              onClick={onSecretTap}
              className="block rounded-sm font-display text-xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={storeConfig.name}
            >
              {storeConfig.name}
            </button>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-gold">
              {storeConfig.tagline}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {storeConfig.footer.blurb}
            </p>
            {socials.length > 0 ? (
              <div className="mt-5 flex items-center gap-2">
                {socials.map(({ key, label, href, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${storeConfig.name} on ${label}`}
                    className="flex size-9 items-center justify-center rounded-full border border-border bg-background text-foreground/80 transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          {/* Shop links */}
          <nav aria-label="Shop">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">Shop</p>
            <ul className="mt-4 space-y-2.5">
              {storeConfig.footer.quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Support links */}
          <nav aria-label="Customer support">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
              Customer care
            </p>
            <ul className="mt-4 space-y-2.5">
              {storeConfig.footer.supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">Contact</p>
            {hasAnyContact ? (
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {settings?.phone ? (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
                    <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-primary">
                      {settings.phone}
                    </a>
                  </li>
                ) : null}
                {settings?.email ? (
                  <li className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
                    <a href={`mailto:${settings.email}`} className="break-all hover:text-primary">
                      {settings.email}
                    </a>
                  </li>
                ) : null}
                {settings?.location ? (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
                    <span>{settings?.location}</span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-4 text-sm italic text-muted-foreground/80">
                Contact details are being updated. Use the{" "}
                <Link href="/contact" className="underline underline-offset-2 hover:text-primary">
                  contact page
                </Link>{" "}
                to reach us.
              </p>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {year} {settings?.name ?? storeConfig.name}. All rights reserved.
          </p>
          <p className="tracking-wide">{storeConfig.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
