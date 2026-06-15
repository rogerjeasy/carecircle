import { getTranslations } from "next-intl/server";
import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

export async function PrivacyScreen() {
  const t = await getTranslations("legal");
  const collectItems = t.raw("privacy.collect.items") as string[];
  const choicesItems = t.raw("privacy.choices.items") as string[];
  return (
    <LegalLayout
      eyebrow={t("eyebrow.legal")}
      title={t("privacy.title")}
      subtitle={t("privacy.subtitle")}
      updated={t("privacy.updated")}
      heroImage={legalImg("1554224155-8d04cb21cd6c")}
    >
      <LegalSection title={t("privacy.short.title")}>
        <p>{t("privacy.short.body")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.collect.title")}>
        <ul className="list-disc space-y-1.5 pl-5">
          {collectItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("privacy.use.title")}>
        <p>{t("privacy.use.body")}</p>
        <p>{t("privacy.use.body2")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.who.title")}>
        <p>{t("privacy.who.body")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.choices.title")}>
        <ul className="list-disc space-y-1.5 pl-5">
          {choicesItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title={t("privacy.contact.title")}>
        <p>
          {t.rich("privacy.contact.body", {
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
