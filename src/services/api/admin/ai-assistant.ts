import { apiRequest } from "../client";
import type { AiParseResponse } from "@/types";

/** AI Product Assistant API — /api/admin/ai-assistant */
export const adminAiAssistantApi = {
  /**
   * Turn a natural-language description (plus optional already-uploaded photo
   * URLs) into reviewable product drafts. Nothing is saved until the owner
   * publishes through the normal products API.
   */
  parse(
    token: string,
    input: { text: string; imageUrls?: string[] },
    signal?: AbortSignal
  ): Promise<AiParseResponse> {
    return apiRequest<AiParseResponse>("/api/admin/ai-assistant", {
      method: "POST",
      authToken: token,
      body: input,
      signal,
    });
  },
};
