import type { Metadata } from "next";
import { SecurityScreen } from "@/components/legal";

export const metadata: Metadata = {
  title: "Security · CareCircle",
  description: "How CareCircle protects sensitive health and family data with defense-in-depth.",
};

export default function SecurityPage() {
  return <SecurityScreen />;
}
