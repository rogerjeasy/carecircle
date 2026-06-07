import type { Metadata } from "next";
import { TermsScreen } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service · CareCircle",
  description: "The agreement between you and CareCircle when you use the service.",
};

export default function TermsPage() {
  return <TermsScreen />;
}
