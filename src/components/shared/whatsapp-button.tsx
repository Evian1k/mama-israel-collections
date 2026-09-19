"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { useMounted } from "@/hooks/use-mounted";
import { buildWhatsAppUrl, isWhatsAppConfigured } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  /** Pre-filled message; a generic enquiry is used when omitted */
  message?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** Show only when WhatsApp is configured (default true) */
  hideWhenUnconfigured?: boolean;
}

/**
 * WhatsApp call-to-action. The number is a store setting — when it is not
 * configured yet this button renders nothing (never a broken link).
 */
export function WhatsAppButton({
  message,
  label = "Chat on WhatsApp",
  variant = "default",
  size = "default",
  className,
  hideWhenUnconfigured = true,
}: WhatsAppButtonProps) {
  const mounted = useMounted();
  const { data: settings, isLoading } = useStoreSettings();

  // Settings are fetched on the client; rendering only after mount keeps the
  // server HTML and the first client render identical (no hydration mismatch).
  if (!mounted || (isLoading && hideWhenUnconfigured)) return null;

  const number = settings?.whatsappNumber;
  if (!isWhatsAppConfigured(number)) return null;

  const url = buildWhatsAppUrl(number, message ?? `Hello ${settings?.name ?? "Mama Israel Collections"}!`);

  return (
    <Button asChild variant={variant} size={size} className={cn("gap-2", className)}>
      <a href={url ?? "#"} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens WhatsApp)`}>
        <MessageCircle className="size-4" aria-hidden="true" />
        {label}
      </a>
    </Button>
  );
}

/** Brand green floating bubble — used on the storefront layout */
export function WhatsAppFloat() {
  const mounted = useMounted();
  const { data: settings } = useStoreSettings();
  if (!mounted || !isWhatsAppConfigured(settings?.whatsappNumber)) return null;

  const url = buildWhatsAppUrl(
    settings?.whatsappNumber,
    `Hello ${settings?.name ?? "Mama Israel Collections"}! 👋 I have a question.`
  );

  return (
    <a
      href={url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex size-13 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/15 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </a>
  );
}
