import { getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import { RemoteImage } from "@/components/marketing/remote-image";
import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

export async function HipaaScreen() {
  const t = await getTranslations("legal");
  const safeguards = t.raw("hipaa.safeguards") as string[];
  return (
    <LegalLayout
      eyebrow={t("eyebrow.compliance")}
      title={t("hipaa.title")}
      subtitle={t("hipaa.subtitle")}
      heroImage={legalImg("1576091160550-2173dba999ef")}
    >
      <LegalSection title={t("hipaa.approach.title")}>
        <p>{t("hipaa.approach.body")}</p>
      </LegalSection>

      {/* Image beside the safeguards list */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border bg-card p-4 sm:p-6 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">{t("hipaa.safeguardsTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {safeguards.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span className="text-pretty text-muted-foreground">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <RemoteImage
          src={legalImg("1551288049-bebda4e38f71", 1000)}
          alt=""
          className="order-first h-48 w-full rounded-xl object-cover md:order-last md:h-full"
        />
      </div>

      <LegalSection title={t("hipaa.baa.title")}>
        <p>
          {t.rich("hipaa.baa.body", {
            a: (chunks) => (
              <a href="mailto:sales@kintwadi.app" className="font-medium text-primary hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("hipaa.report.title")}>
        <p>
          {t.rich("hipaa.report.body", {
            a: (chunks) => (
              <a href="mailto:privacy@kintwadi.app" className="font-medium text-primary hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
