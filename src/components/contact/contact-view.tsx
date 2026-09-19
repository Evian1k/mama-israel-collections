"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Facebook,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  RotateCcw,
  Send,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { useContactMessage } from "@/hooks/use-engagement";
import { storeConfig } from "@/config/store";
import {
  generalEnquiryMessage,
  isWhatsAppConfigured,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp";
import { ApiError } from "@/services/api/client";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Form schema (mirrors the server contract: name, email, phone?, message)
 * ------------------------------------------------------------------------- */
const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name (at least 2 characters).")
    .max(80, "Please keep your name under 80 characters."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .max(24, "Please keep your phone number under 24 characters.")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Please write a short message (at least 10 characters).")
    .max(2000, "Please keep your message under 2,000 characters."),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

/** "254712345678" -> "+254 712 345 678" (display only; null when unusable) */
function formatWhatsAppDisplay(raw: string | null | undefined): string | null {
  const digits = normalizeWhatsAppNumber(raw);
  if (!digits) return null;
  if (digits.length <= 9) return `+${digits}`;
  return `+${digits.slice(0, digits.length - 9)} ${digits.slice(-9, -6)} ${digits.slice(-6, -3)} ${digits.slice(-3)}`;
}

function isUsablePhone(value: string | null | undefined): boolean {
  return Boolean(value && value.replace(/\D/g, "").length >= 7);
}

function isUsableEmail(value: string | null | undefined): boolean {
  return Boolean(value && value.includes("@"));
}

/* ---------------------------------------------------------------------------
 * Presentational helpers
 * ------------------------------------------------------------------------- */
function ChannelCard({
  icon: Icon,
  iconClassName,
  title,
  children,
}: {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-xs">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary",
            iconClassName
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function UnconfiguredNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm italic leading-relaxed text-muted-foreground">{children}</p>
  );
}

function SocialButton({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Visit us on ${label} (opens in a new tab)`}
      className="flex size-11 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Icon className="size-4.5" aria-hidden="true" />
    </a>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

/* ---------------------------------------------------------------------------
 * ContactView
 * ------------------------------------------------------------------------- */
export function ContactView() {
  const { data: settings, isLoading: settingsLoading } = useStoreSettings();
  const contactMessage = useContactMessage();
  const [serverError, setServerError] = useState<string | null>(null);

  const storeName = settings?.name ?? storeConfig.name;

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
    mode: "onTouched",
  });
  const messageValue = form.watch("message") ?? "";

  const whatsappReady = isWhatsAppConfigured(settings?.whatsappNumber);
  const whatsappDisplay = formatWhatsAppDisplay(settings?.whatsappNumber);
  const phoneReady = isUsablePhone(settings?.phone);
  const emailReady = isUsableEmail(settings?.email);
  const location = settings?.location?.trim() ?? "";

  const candidateSocials: {
    key: string;
    label: string;
    icon: LucideIcon;
    href: string | undefined;
  }[] = [
    { key: "instagram", label: "Instagram", icon: Instagram, href: settings?.socialLinks?.instagram },
    { key: "facebook", label: "Facebook", icon: Facebook, href: settings?.socialLinks?.facebook },
    { key: "tiktok", label: "TikTok", icon: Music2, href: settings?.socialLinks?.tiktok },
    { key: "twitter", label: "X (Twitter)", icon: Twitter, href: settings?.socialLinks?.twitter },
  ];
  const socials = candidateSocials.flatMap((social) =>
    social.href && social.href.trim() !== ""
      ? [{ key: social.key, label: social.label, icon: social.icon, href: social.href }]
      : []
  );

  const onSubmit = (values: ContactFormValues) => {
    setServerError(null);
    contactMessage.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
        message: values.message.trim(),
      },
      {
        onError: (error) => {
          const description =
            error instanceof ApiError
              ? error.message
              : "We could not send your message right now. Please try again in a moment.";
          setServerError(description);
          toast.error("Message not sent", { description });
        },
      }
    );
  };

  const handleSendAnother = () => {
    form.reset();
    contactMessage.reset();
    setServerError(null);
  };

  const inputProps = (field: keyof ContactFormValues, errorId: string) => ({
    "aria-invalid": Boolean(form.formState.errors[field]),
    "aria-describedby": form.formState.errors[field] ? errorId : undefined,
  });

  return (
    <>
      {/* Header strip */}
      <section className="border-b border-border bg-secondary/50">
        <div className="container-page py-14 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold">
              Contact
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
              We would love to hear from you
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              Questions about a piece, your order or delivery? Reach us any way
              you like — real people reply, personally.
            </p>
          </div>
        </div>
      </section>

      <div className="container-page py-14 sm:py-16">
        {/* Channel cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
          <ChannelCard
            icon={MessageCircle}
            iconClassName="bg-[#25D366]/12 text-[#1a9e4b]"
            title="WhatsApp"
          >
            {whatsappReady ? (
              <div>
                <p className="font-medium text-foreground">{whatsappDisplay}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  The fastest way to reach us — tap to start a chat.
                </p>
                <WhatsAppButton
                  size="sm"
                  className="mt-4 rounded-full"
                  message={generalEnquiryMessage(storeName)}
                />
              </div>
            ) : (
              <UnconfiguredNote>
                {settingsLoading
                  ? "Checking our details…"
                  : "Being set up — check back soon."}
              </UnconfiguredNote>
            )}
          </ChannelCard>

          <ChannelCard icon={Phone} title="Phone">
            {phoneReady ? (
              <div>
                <a
                  href={`tel:${settings?.phone.replace(/\s+/g, "")}`}
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {settings?.phone}
                </a>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Call or text — we will pick up when we can.
                </p>
              </div>
            ) : (
              <UnconfiguredNote>
                {settingsLoading ? "Checking our details…" : "Being set up — check back soon."}
              </UnconfiguredNote>
            )}
          </ChannelCard>

          <ChannelCard icon={Mail} title="Email">
            {emailReady ? (
              <div>
                <a
                  href={`mailto:${settings?.email}`}
                  className="font-medium break-all text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {settings?.email}
                </a>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Write to us and we will reply as soon as we can.
                </p>
              </div>
            ) : (
              <UnconfiguredNote>
                {settingsLoading ? "Checking our details…" : "Being set up — check back soon."}
              </UnconfiguredNote>
            )}
          </ChannelCard>

          <ChannelCard icon={MapPin} title="Location">
            {location ? (
              <div>
                <p className="font-medium text-foreground">{location}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  We serve customers right across Kenya.
                </p>
              </div>
            ) : (
              <UnconfiguredNote>
                {settingsLoading ? "Checking our details…" : "Kenya — details coming soon."}
              </UnconfiguredNote>
            )}
          </ChannelCard>
        </div>

        {/* Social row — only when configured */}
        {socials.length > 0 ? (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Follow along
            </span>
            {socials.map((social) => (
              <SocialButton
                key={social.key}
                label={social.label}
                href={social.href}
                icon={social.icon}
              />
            ))}
          </div>
        ) : null}

        {/* Contact form / success card */}
        <section aria-labelledby="message-form-heading" className="mt-12">
          {contactMessage.isSuccess ? (
            <div
              role="status"
              className="flex flex-col items-center rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-xs"
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </span>
              <h2
                id="message-form-heading"
                className="mt-6 font-display text-2xl font-semibold text-foreground"
              >
                Message received!
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We will get back to you soon.
              </p>
              <Button
                variant="outline"
                className="mt-8 rounded-full"
                onClick={handleSendAnother}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Send another message
              </Button>
            </div>
          ) : (
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8"
            >
              <h2
                id="message-form-heading"
                className="font-display text-2xl font-semibold text-foreground"
              >
                Send us a message
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Fill in the form below and we will get back to you as soon as we can.
              </p>

              {serverError ? (
                <Alert variant="destructive" className="mt-6">
                  <AlertTriangle aria-hidden="true" />
                  <AlertTitle>Your message was not sent</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">Your name</Label>
                  <Input
                    id="contact-name"
                    placeholder="Your full name"
                    autoComplete="name"
                    {...form.register("name")}
                    {...inputProps("name", "contact-name-error")}
                  />
                  <FieldError
                    id="contact-name-error"
                    message={form.formState.errors.name?.message}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...form.register("email")}
                    {...inputProps("email", "contact-email-error")}
                  />
                  <FieldError
                    id="contact-email-error"
                    message={form.formState.errors.email?.message}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="contact-phone">
                    Phone <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="contact-phone"
                    type="tel"
                    inputMode="tel"
                    placeholder={storeConfig.phoneHint}
                    autoComplete="tel"
                    {...form.register("phone")}
                    {...inputProps("phone", "contact-phone-error")}
                  />
                  <FieldError
                    id="contact-phone-error"
                    message={form.formState.errors.phone?.message}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    rows={6}
                    maxLength={2000}
                    placeholder="How can we help you?"
                    {...form.register("message")}
                    {...inputProps("message", "contact-message-error")}
                    aria-describedby={
                      form.formState.errors.message
                        ? "contact-message-error"
                        : "contact-message-hint"
                    }
                  />
                  {form.formState.errors.message ? (
                    <FieldError
                      id="contact-message-error"
                      message={form.formState.errors.message?.message}
                    />
                  ) : (
                    <p
                      id="contact-message-hint"
                      className="text-right text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      {messageValue.length.toLocaleString("en-KE")} / 2,000
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={contactMessage.isPending}
                className="mt-6 w-full rounded-full sm:w-auto"
              >
                {contactMessage.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden="true" />
                    Send message
                  </>
                )}
              </Button>
            </form>
          )}
        </section>
      </div>
    </>
  );
}
