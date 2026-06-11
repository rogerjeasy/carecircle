import type { Metadata } from "next";
import { ContactScreen } from "@/components/contact";

export const metadata: Metadata = {
  title: "Contact · Kintwadi",
  description: "Get in touch with the Kintwadi team — questions, feedback, sales, support, and partnerships.",
};

export default function ContactPage() {
  return <ContactScreen />;
}
