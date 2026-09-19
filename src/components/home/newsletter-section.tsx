"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNewsletterSubscribe } from "@/hooks/use-engagement";
import { storeConfig } from "@/config/store";
import { ApiError } from "@/services/api/client";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_ERROR = "Subscription failed. Please try again.";

/** "Be first to see new arrivals" — sand band with an accessible email form */
export function NewsletterSection() {
  const copy = storeConfig.content.newsletter;
  const [email, setEmail] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const subscribe = useNewsletterSubscribe();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim();

    if (!EMAIL_PATTERN.test(value)) {
      setValidationError("Please enter a valid email address.");
      return;
    }
    setValidationError(null);

    subscribe.mutate(value, {
      onSuccess: () => {
        setSubscribed(true);
        setEmail("");
        toast.success(copy.successMessage);
      },
      onError: (error) => {
        const message =
          error instanceof ApiError ? error.message : GENERIC_ERROR;
        toast.error(message);
      },
    });
  }

  return (
    <section aria-labelledby="newsletter-heading" className="bg-secondary/40">
      <div className="container-page py-16 lg:py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-gold">
            {storeConfig.tagline}
          </p>
          <h2
            id="newsletter-heading"
            className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {copy.description}
          </p>

          {subscribed ? (
            <div
              role="status"
              className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-6 sm:flex-row sm:gap-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold">
                <Check className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-medium leading-relaxed text-foreground">
                {copy.successMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mt-8">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={
                    validationError ? "newsletter-email-error" : undefined
                  }
                  disabled={subscribe.isPending}
                  className="h-12 flex-1 rounded-full bg-background px-6"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={subscribe.isPending}
                  className="h-12 rounded-full px-8"
                >
                  {subscribe.isPending ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      Subscribing…
                    </>
                  ) : (
                    copy.buttonLabel
                  )}
                </Button>
              </div>
              {validationError ? (
                <p
                  id="newsletter-email-error"
                  role="alert"
                  className="mt-3 text-sm text-destructive"
                >
                  {validationError}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
