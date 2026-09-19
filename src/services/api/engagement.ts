import { apiRequest } from "./client";

/**
 * Engagement API (documented Phase 1 extension):
 * - POST /api/newsletter  { email }
 * - POST /api/contact     { name, email, phone?, message }
 */
export interface NewsletterResult {
  email: string;
  message: string;
}

export interface ContactResult {
  message: string;
}

export const engagementApi = {
  subscribe(email: string): Promise<NewsletterResult> {
    return apiRequest<NewsletterResult>("/api/newsletter", {
      method: "POST",
      body: { email: email.trim().toLowerCase() },
    });
  },

  sendContactMessage(input: {
    name: string;
    email: string;
    phone?: string;
    message: string;
  }): Promise<ContactResult> {
    return apiRequest<ContactResult>("/api/contact", { method: "POST", body: input });
  },
};
