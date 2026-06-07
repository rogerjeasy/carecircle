import type { Metadata } from "next";
import { PrivacyScreen } from "@/components/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · CareCircle",
  description: "How CareCircle collects, uses, and protects the information you trust us with.",
};

export default function PrivacyPage() {
  return <PrivacyScreen />;
}
