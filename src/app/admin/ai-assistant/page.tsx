import type { Metadata } from "next";

import { AiAssistantView } from "@/components/admin/ai-assistant/ai-assistant-view";

export const metadata: Metadata = {
  title: "AI Product Assistant",
  description: "Add products by describing them in plain language — review, then publish.",
};

export default function AiAssistantPage() {
  return <AiAssistantView />;
}
