import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

export function TermsScreen() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="The agreement between you and Kintwadi when you use the service."
      updated="June 6, 2026"
      heroImage={legalImg("1606166187734-a4cb74079037")}
    >
      <LegalSection title="Using Kintwadi">
        <p>
          Kintwadi helps families and care teams coordinate care. By creating an account you agree to use it lawfully,
          to keep your login secure, and to respect the privacy of everyone in your care circles.
        </p>
      </LegalSection>

      <LegalSection title="Not a medical service">
        <p>
          Kintwadi is a coordination tool, not a medical device or a provider of medical advice. Safety features such
          as interaction warnings and decline detection are supportive aids — they don&apos;t replace professional
          clinical judgment. In an emergency, call your local emergency number.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You keep ownership of the content you add. You grant us the limited permission needed to store and display it
          to the right members and to operate features like the Daily Digest. You&apos;re responsible for having the
          right to share information about the people you care for.
        </p>
      </LegalSection>

      <LegalSection title="Plans & billing">
        <p>
          Free and paid plans are described on our{" "}
          <a href="/pricing" className="font-medium text-primary hover:underline">
            pricing page
          </a>
          . Paid subscriptions renew until cancelled; you can change or cancel at any time, with changes taking effect at
          the next billing cycle.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Don&apos;t misuse the service, attempt to break its security, or access data you&apos;re not entitled to.</li>
          <li>Don&apos;t upload unlawful content or impersonate others.</li>
          <li>Respect the role-based permissions of your care circle.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update these terms as the product evolves. We&apos;ll note the date above and, for material changes,
          let you know in the app or by email.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
