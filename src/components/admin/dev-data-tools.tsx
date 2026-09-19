"use client";

import { FlaskConical, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDevDataControls } from "@/hooks/admin/use-admin-stats";

function toastMutationError(error: unknown) {
  toast.error(
    error instanceof Error ? error.message : "Something went wrong. Please try again."
  );
}

/**
 * DEVELOPMENT-ONLY dev data controls shared by the dashboard onboarding card
 * and the Analytics empty state. Sample data is always clearly labelled and
 * wipeable — the production store starts empty.
 */

/** Seeds the opt-in sample catalogue; success toast uses the API's message. */
export function SeedSampleButton({
  label = "Load sample catalogue (preview)",
  pendingLabel = "Loading sample data…",
  size = "sm",
  className,
}: {
  label?: string;
  pendingLabel?: string;
  size?: "sm" | "default";
  className?: string;
}) {
  const { seedSample } = useDevDataControls();

  return (
    <Button
      type="button"
      size={size}
      className={className}
      disabled={seedSample.isPending}
      onClick={() =>
        seedSample.mutate(undefined, {
          onSuccess: (data) => toast.success(data.message),
          onError: toastMutationError,
        })
      }
    >
      {seedSample.isPending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <FlaskConical className="size-4" aria-hidden="true" />
      )}
      {seedSample.isPending ? pendingLabel : label}
    </Button>
  );
}

/** Destructive dev reset behind a confirm dialog; wipes the dev store. */
export function ResetDevDataButton({
  size = "sm",
  className,
}: {
  size?: "sm" | "default";
  className?: string;
}) {
  const { resetAll } = useDevDataControls();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          className={className}
          disabled={resetAll.isPending}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset all dev data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset everything?</AlertDialogTitle>
          <AlertDialogDescription>
            This wipes all products, categories and orders in the dev store —
            including any sample data you loaded. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() =>
              resetAll.mutate(undefined, {
                onSuccess: (data) => toast.success(data.message),
                onError: toastMutationError,
              })
            }
          >
            Yes, reset everything
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
