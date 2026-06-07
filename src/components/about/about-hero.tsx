import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HERO, STATS } from "./data";

/** About hero: tagline, summary, CTAs, and the market-stat strip. */
export function AboutHero() {
  return (
    <section className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
      <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
        <Badge variant="secondary" className="mb-4 gap-1.5">
          <Heart className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          About CareCircle
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {HERO.tagline}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          {HERO.subtitle}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">
              Get started free
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/pricing">See pricing</Link>
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <dl className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5 text-center">
            <dt className="sr-only">{s.label}</dt>
            <dd className="font-serif text-3xl font-bold tracking-tight text-primary sm:text-4xl">{s.value}</dd>
            <p className="mt-1.5 text-pretty text-xs text-muted-foreground sm:text-sm">{s.label}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
