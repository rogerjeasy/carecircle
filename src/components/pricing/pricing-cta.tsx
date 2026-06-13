import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Closing call-to-action. */
export function PricingCta() {
  return (
    <Card className="bg-primary/5 border-primary/10">
      <CardContent className="py-12 sm:py-12 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">Ready to simplify care coordination?</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Bring everyone caring for your loved one onto one shared record. Start free, no credit card required.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg">Get started free</Button>
          </Link>
          <Button variant="outline" size="lg" asChild>
            <a href="mailto:sales@kintwadi.app">Talk to sales</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
