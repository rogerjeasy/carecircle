import { Check } from "lucide-react";
import { RemoteImage } from "@/components/marketing/remote-image";
import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

const SAFEGUARDS = [
  "Encryption of PHI in transit and at rest",
  "Role-based access enforced at the database (row-level security)",
  "An append-only audit log of who viewed or changed what",
  "Least-privilege access and server-side secrets",
  "Clear separation of demo data from any real data",
];

export function HipaaScreen() {
  return (
    <LegalLayout
      eyebrow="Compliance"
      title="HIPAA"
      subtitle="Kintwadi is built with HIPAA principles in mind — designed to protect health information from day one."
      heroImage={legalImg("1576091160550-2173dba999ef")}
    >
      <LegalSection title="Our approach">
        <p>
          Kintwadi handles Protected Health Information (PHI), so we follow HIPAA&apos;s security and privacy
          principles throughout the product: minimum-necessary access, strong technical safeguards, and a full audit
          trail. This page describes our design posture; it is not a claim of formal certification.
        </p>
      </LegalSection>

      {/* Image beside the safeguards list */}
      <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border bg-card p-4 sm:p-6 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">Technical safeguards</h2>
          <ul className="mt-4 space-y-2.5">
            {SAFEGUARDS.map((s) => (
              <li key={s} className="flex items-start gap-2.5 text-sm">
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

      <LegalSection title="Business Associate Agreements (BAA)">
        <p>
          For organizations that require a signed BAA — home-care agencies, assisted-living facilities, and similar — a
          BAA is available on our Care Teams plan. Reach out to{" "}
          <a href="mailto:sales@kintwadi.app" className="font-medium text-primary hover:underline">
            sales@kintwadi.app
          </a>{" "}
          to start the conversation.
        </p>
      </LegalSection>

      <LegalSection title="Reporting a concern">
        <p>
          If you believe health information may have been handled improperly, contact{" "}
          <a href="mailto:privacy@kintwadi.app" className="font-medium text-primary hover:underline">
            privacy@kintwadi.app
          </a>{" "}
          and we&apos;ll investigate.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
