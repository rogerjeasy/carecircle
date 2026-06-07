import { DatabaseZap, KeyRound, Lock, ScrollText, ServerCog, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { RemoteImage } from "@/components/marketing/remote-image";
import { LegalLayout, LegalSection, legalImg } from "./legal-layout";

const MEASURES = [
  { icon: Lock, title: "Encryption everywhere", body: "Data is encrypted in transit (TLS) and at rest." },
  { icon: ShieldCheck, title: "Row-level security", body: "Role-based access is enforced in the database, not just the UI." },
  { icon: ScrollText, title: "Append-only audit log", body: "Every sensitive read or change is recorded and immutable." },
  { icon: KeyRound, title: "Least privilege", body: "Each role sees only the slice of the record it needs." },
  { icon: DatabaseZap, title: "Resilient data", body: "Managed Postgres with automated, encrypted backups." },
  { icon: ServerCog, title: "Secrets stay server-side", body: "Credentials live in environment config — never in the client." },
];

export function SecurityScreen() {
  return (
    <LegalLayout
      eyebrow="Trust"
      title="Security"
      subtitle="CareCircle holds sensitive health and family data. Protecting it is a first-class design goal, not an afterthought."
      heroImage={legalImg("1569949381669-ecf31ae8e613")}
    >
      <LegalSection title="Defense in depth">
        <p>
          Caregiving is an inherently access-controlled domain, so we built security into the data model itself.
          Permissions are enforced at multiple layers — the edge, the application, and the database — so a single bug
          can&apos;t expose data a person shouldn&apos;t see.
        </p>
      </LegalSection>

      {/* Measures grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MEASURES.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className="h-full">
              <CardContent className="flex h-full gap-3 p-4 sm:p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.body}</p>
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
          <h2 className="font-serif text-xl font-bold tracking-tight sm:text-2xl">Enforced at the database</h2>
          <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
            Row-level security means a hired aide physically cannot read a family&apos;s financial documents, and
            safety-critical actions like &ldquo;give a medication&rdquo; commit as a single atomic transaction — logging
            the event, decrementing supply, and writing the timeline entry together, or not at all.
          </p>
        </div>
      </div>

      <LegalSection title="Responsible disclosure">
        <p>
          Found a vulnerability? We appreciate your help. Email{" "}
          <a href="mailto:security@carecircle.app" className="font-medium text-primary hover:underline">
            security@carecircle.app
          </a>{" "}
          and we&apos;ll respond promptly.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
