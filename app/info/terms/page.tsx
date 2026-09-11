import type { Metadata } from "next";
import { LegalDocumentView } from "@/components/LegalDocument";
import { appName } from "@/components/Stemlock";
import { terms } from "@/lib/legal";

export const metadata: Metadata = {
  title: `Terms of Use — ${appName}`,
  description: `The terms you accept by using ${appName}.`,
};

export default function TermsPage() {
  return <LegalDocumentView document={terms} />;
}
