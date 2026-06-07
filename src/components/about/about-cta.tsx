import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Closing call-to-action for the About page. */
export function AboutCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Card className="border-primary/10 bg-primary/5">
        <CardContent className="px-6 py-12 text-center sm:py-14">
          <h2 className="text-balance font-serif text-2xl font-bold sm:text-3xl">
            Care, together — wherever you are
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
            Bring your family and care team into one shared, permission-aware record. Start free, no credit card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/sign-up">Get started free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
