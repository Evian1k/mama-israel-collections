import type { Metadata } from "next";
import { AdminSettingsView } from "@/components/admin/settings/admin-settings-view";

export const metadata: Metadata = {
  title: "Settings",
  description: "Store profile, contact details, delivery rules and dev data controls.",
};

export default function AdminSettingsPage() {
  return <AdminSettingsView />;
}
