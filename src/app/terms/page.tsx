import type { Metadata } from "next";
import { TermsScreen } from "@/components/legal";

export const metadata: Metadata = {
  title: "Terms of Service · Kintwadi",
  description: "The agreement between you and Kintwadi when you use the service.",
};

export default function TermsPage() {
  return <TermsScreen />;
}
