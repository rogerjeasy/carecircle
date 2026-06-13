import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogPostScreen, ALL_POSTS, getPost } from "@/components/blog";

export function generateStaticParams() {
  return ALL_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found · Kintwadi" };
  return {
    title: `${post.title} · Kintwadi`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  return <BlogPostScreen post={post} />;
}
