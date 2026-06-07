import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

export function PrivacyScreen() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="How CareCircle collects, uses, and protects the information you trust us with."
      updated="June 6, 2026"
      heroImage={legalImg("1554224155-8d04cb21cd6c")}
    >
      <LegalSection title="The short version">
        <p>
          CareCircle holds sensitive information about families and the people they care for. We collect only what we
          need to coordinate care, we never sell your data, and we scope every person&apos;s access to their role.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Account details — your name, email, and avatar.</li>
          <li>Care-circle content you add — the care recipient&apos;s profile, medications, timeline updates, tasks, appointments, vitals, and documents.</li>
          <li>Usage and device information needed to keep the service secure and reliable.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          To provide the service: showing each member the right slice of one shared record, sending notifications and the
          Daily Digest, and surfacing safety signals like missed-med streaks or interaction warnings.
        </p>
        <p>We do not sell personal information or use care content for advertising.</p>
      </LegalSection>

      <LegalSection title="Who can see your data">
        <p>
          Access is determined by role within a care circle and enforced at the database with row-level security — a
          hired aide, for example, can never read a family&apos;s financial or legal documents. Every sensitive action is
          recorded in an append-only audit log.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Export a copy of your circle&apos;s record at any time.</li>
          <li>Control what you share — the care recipient decides what others see about them.</li>
          <li>Delete your account; we remove your personal data on request.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about privacy? Email{" "}
          <a href="mailto:privacy@carecircle.app" className="font-medium text-primary hover:underline">
            privacy@carecircle.app
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
