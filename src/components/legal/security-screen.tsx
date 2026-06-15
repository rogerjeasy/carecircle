import { DatabaseZap, KeyRound, Lock, ScrollText, ServerCog, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent } from "@/components/ui/card";
import { RemoteImage } from "@/components/marketing/remote-image";
import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

// Icons only; titles/bodies resolved from messages (`legal.security.measures.<key>.*`).
const MEASURES = [
  { key: "encryption", icon: Lock },
  { key: "rls", icon: ShieldCheck },
  { key: "audit", icon: ScrollText },
  { key: "leastPriv", icon: KeyRound },
  { key: "resilient", icon: DatabaseZap },
  { key: "secrets", icon: ServerCog },
] as const;

export async function SecurityScreen() {
  const t = await getTranslations("legal");
  return (
    <LegalLayout
      eyebrow={t("eyebrow.trust")}
      title={t("security.title")}
      subtitle={t("security.subtitle")}
      heroImage={legalImg("1569949381669-ecf31ae8e613")}
    >
      <LegalSection title={t("security.depth.title")}>
        <p>{t("security.depth.body")}</p>
      </LegalSection>

      {/* Measures grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MEASURES.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.key} className="h-full">
              <CardContent className="flex h-full gap-3 p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{t(`security.measures.${m.key}.title` as "security.measures.encryption.title")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`security.measures.${m.key}.body` as "security.measures.encryption.body")}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Image beside text */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border bg-card p-4 sm:p-6 md:grid-cols-2">
        <RemoteImage src={legalImg("1547592180-85f173990554", 1000)} alt="" className="h-48 w-full rounded-xl object-cover md:h-full" />
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">{t("security.db.title")}</h2>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{t("security.db.body")}</p>
        </div>
      </div>

      <LegalSection title={t("security.disclosure.title")}>
        <p>
          {t.rich("security.disclosure.body", {
            a: (chunks) => (
              <a href="mailto:security@kintwadi.app" className="font-medium text-primary hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
