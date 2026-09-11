import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/LegalDocument";
import { appName } from "@/components/Stemlock";
import { privacy } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Privacy Policy — ${appName}`,
  description: `What ${appName} stores about you, where it lives and how to delete it.`,
};

export default function PrivacyPage() {
  return <LegalDocumentView document={privacy} />;
}
