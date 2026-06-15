import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Closing call-to-action. */
export function PricingCta() {
  const t = useTranslations("pricing.cta");

  return (
    <Card className="bg-primary/5 border-primary/10">
      <CardContent className="py-12 sm:py-12 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">{t("title")}</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">{t("subtitle")}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/sign-up">
            <Button size="lg">{t("getStarted")}</Button>
          </Link>
          <Button variant="outline" size="lg" asChild>
            <a href="mailto:sales@kintwadi.app">{t("talkToSales")}</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
