"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storeConfig } from "@/config/store";

/**
 * Global client error boundary — standalone branded panel (no header/footer),
 * offering a retry and a way back home. Never a blank screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Surface the real error in the console for debugging (digest included).
    console.error("[app-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div
          role="alert"
          className="flex w-full max-w-md flex-col items-center rounded-3xl border border-destructive/25 bg-destructive/5 px-6 py-14 text-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            An unexpected error interrupted this page. Please try again in a
            moment — if it keeps happening, we are working on it.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button className="rounded-full" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Home
            </Button>
          </div>
        </div>
      </main>

      <footer className="px-4 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          {storeConfig.name} · <span className="text-gold">{storeConfig.tagline}</span>
        </p>
      </footer>
    </div>
  );
}
