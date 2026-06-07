import type { Metadata } from "next";
import { ContactScreen } from "@/components/contact";

export const metadata: Metadata = {
  title: "Contact · CareCircle",
  description: "Get in touch with the CareCircle team — questions, feedback, sales, support, and partnerships.",
};

export default function ContactPage() {
  return <ContactScreen />;
}
