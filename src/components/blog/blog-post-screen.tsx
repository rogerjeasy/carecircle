import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { RemoteImage } from "@/components/marketing/remote-image";
import type { Post } from "./data";

/** A single, full blog article. Content comes from the post's real `body` blocks. */
export async function BlogPostScreen({ post }: { post: Post }) {
  const t = await getTranslations("blog");
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main className="overflow-x-hidden pb-20 pt-28 sm:pt-32">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t("allPosts")}
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="default">{post.category}</Badge>
          </div>
          <h1 className="mt-4 text-balance font-serif text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className={cn("text-[11px] font-semibold", post.author.color)}>
                  {post.author.initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{post.author.name}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{post.date}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readTime}
            </span>
          </div>

          <RemoteImage
            src={post.cover}
            alt=""
            className="mt-8 h-60 w-full rounded-2xl object-cover sm:h-80"
          />

          <div className="mt-8 space-y-5">
            {post.body.map((block, i) => {
              if (block.type === "h2") {
                return (
                  <h2 key={i} className="pt-2 font-serif text-2xl font-bold leading-snug">
                    {block.text}
                  </h2>
                );
              }
              if (block.type === "quote") {
                return (
                  <blockquote
                    key={i}
                    className="border-l-4 border-primary/40 pl-4 font-serif text-xl font-medium italic text-foreground/90"
                  >
                    {block.text}
                  </blockquote>
                );
              }
              return (
                <p key={i} className="text-pretty text-[1.05rem] leading-relaxed text-foreground/90">
                  {block.text}
                </p>
              );
            })}
          </div>
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}
