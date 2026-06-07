import type { Metadata } from "next";
import { AboutScreen } from "@/components/about";

export const metadata: Metadata = {
  title: "About · CareCircle",
  description:
    "CareCircle is one shared, role-aware care record for a family and their helpers — across siblings, cities, and time zones.",
};

export default function AboutPage() {
  return <AboutScreen />;
}
