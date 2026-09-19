"use client";

import { useMutation } from "@tanstack/react-query";
import { engagementApi } from "@/services/api/engagement";

export function useNewsletterSubscribe() {
  return useMutation({ mutationFn: (email: string) => engagementApi.subscribe(email) });
}

export function useContactMessage() {
  return useMutation({
    mutationFn: (input: { name: string; email: string; phone?: string; message: string }) =>
      engagementApi.sendContactMessage(input),
  });
}
