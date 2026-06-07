import type { Metadata } from "next";
import { HipaaScreen } from "@/components/legal";

export const metadata: Metadata = {
  title: "HIPAA · CareCircle",
  description: "CareCircle is built with HIPAA principles in mind — designed to protect health information from day one.",
};

export default function HipaaPage() {
  return <HipaaScreen />;
}
