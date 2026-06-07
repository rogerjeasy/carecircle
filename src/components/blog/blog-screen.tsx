import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { RemoteImage } from "@/components/marketing/remote-image";
import { FEATURED, POSTS, type Post } from "./data";

/** The public Blog index — a featured post + a responsive grid of posts. */
export function BlogScreen() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main className="overflow-x-hidden pb-20 pt-28 sm:pt-32">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <Badge variant="secondary" className="mb-4">
            CareCircle blog
          </Badge>
          <h1 className="text-balance font-serif text-4xl font-bold tracking-tight sm:text-5xl">
            Notes on caring, together
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
            Stories, product updates, and ideas for coordinating care across families, distance and time zones.
          </p>
        </section>

        {/* Featured */}
        <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6 lg:px-8">
          <article className="group overflow-hidden rounded-2xl border bg-card motion-safe:animate-in motion-safe:fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2">
              <RemoteImage
                src={FEATURED.cover}
                alt=""
                className="h-56 w-full object-cover md:h-full"
              />
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{FEATURED.category}</Badge>
                  <span className="text-xs text-muted-foreground">Featured</span>
                </div>
                <h2 className="text-balance font-serif text-2xl font-bold leading-tight">{FEATURED.title}</h2>
                <p className="text-pretty text-sm text-muted-foreground">{FEATURED.excerpt}</p>
                <PostMeta post={FEATURED} />
              </div>
            </div>
          </article>
        </section>

        {/* Grid */}
        <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {POSTS.map((post, i) => (
              <article
                key={post.title}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
                style={{ animationDelay: `${Math.min(i, 6) * 60}ms`, animationFillMode: "backwards" }}
              >
                <div className="relative">
                  <RemoteImage
                    src={post.cover}
                    alt=""
                    className="h-44 w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                  />
                  <Badge className="absolute left-3 top-3 bg-background/90 text-foreground backdrop-blur">
                    {post.category}
                  </Badge>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="text-balance font-semibold leading-snug">{post.title}</h3>
                  <p className="line-clamp-2 text-pretty text-sm text-muted-foreground">{post.excerpt}</p>
                  <div className="mt-auto pt-2">
                    <PostMeta post={post} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}

function PostMeta({ post, className }: { post: Post; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <span className="flex min-w-0 items-center gap-2">
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarFallback className={cn("text-[10px] font-semibold", post.author.color)}>
            {post.author.initials}
          </AvatarFallback>
        </Avatar>
        <span className="truncate font-medium text-foreground">{post.author.name}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>{post.date}</span>
      <span aria-hidden="true">·</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {post.readTime}
      </span>
    </div>
  );
}
