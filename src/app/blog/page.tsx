import type { Metadata } from "next";
import { BlogScreen } from "@/components/blog";

export const metadata: Metadata = {
  title: "Blog · CareCircle",
  description: "Stories, product updates, and ideas for coordinating care across families, distance and time zones.",
};

export default function BlogPage() {
  return <BlogScreen />;
}
