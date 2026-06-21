import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RemoteImage } from "@/components/marketing/remote-image";
import { ABOUT_IMG } from "@/components/marketing/images";

/** Closing call-to-action for the About page. */
export function AboutCta() {
  const t = useTranslations("about.cta");

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Card className="relative isolate overflow-hidden border-primary/20">
        {/* Warm full-bleed photo under a teal scrim — keeps white text at AA contrast */}
        <RemoteImage
          src={ABOUT_IMG.cta}
          alt=""
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/95 via-primary/90 to-primary/75" />
        <CardContent className="px-6 py-12 text-center sm:py-14">
          <h2 className="text-balance font-serif text-2xl font-bold text-primary-foreground sm:text-3xl">{t("title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-primary-foreground/90">{t("subtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="accent" asChild>
              <Link href="/sign-up">{t("getStarted")}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/how-it-works">{t("howItWorks")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
