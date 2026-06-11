import type { Metadata } from "next";
import { SecurityScreen } from "@/components/legal";

export const metadata: Metadata = {
  title: "Security · Kintwadi",
  description: "How Kintwadi protects sensitive health and family data with defense-in-depth.",
};

export default function SecurityPage() {
  return <SecurityScreen />;
}
