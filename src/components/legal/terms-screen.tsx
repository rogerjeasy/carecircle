import { getTranslations } from "next-intl/server";
import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

export async function TermsScreen() {
  const t = await getTranslations("legal");
  const acceptableItems = t.raw("terms.acceptable.items") as string[];
  return (
    <LegalLayout
      eyebrow={t("eyebrow.legal")}
      title={t("terms.title")}
      subtitle={t("terms.subtitle")}
      updated={t("terms.updated")}
      heroImage={legalImg("1606166187734-a4cb74079037")}
    >
      <LegalSection title={t("terms.using.title")}>
        <p>{t("terms.using.body")}</p>
      </LegalSection>

      <LegalSection title={t("terms.notMedical.title")}>
        <p>{t("terms.notMedical.body")}</p>
      </LegalSection>

      <LegalSection title={t("terms.content.title")}>
        <p>{t("terms.content.body")}</p>
      </LegalSection>

      <LegalSection title={t("terms.billing.title")}>
        <p>
          {t.rich("terms.billing.body", {
            a: (chunks) => (
              <a href="/pricing" className="font-medium text-primary hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </LegalSection>

      <LegalSection title={t("terms.acceptable.title")}>
        <ul className="list-disc space-y-1.5 pl-5">
          {acceptableItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("terms.changes.title")}>
        <p>{t("terms.changes.body")}</p>
      </LegalSection>
    </LegalLayout>
  );
}
