import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { ContactForm } from "./contact-form";
import { CONTACT_METHODS } from "./data";

/** Public Contact page — wrapped in the marketing chrome. */
export function ContactScreen() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <main className="overflow-x-hidden pb-20 pt-28 sm:pt-32">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500">
            <Badge variant="secondary" className="mb-4">
              Contact us
            </Badge>
            <h1 className="text-balance font-serif text-4xl font-bold tracking-tight sm:text-5xl">
              We&apos;d love to hear from you
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
              Questions, feedback, or thinking about Kintwadi for your family or organization? Send a note and a real
              person will reply.
            </p>
          </div>
        </section>

        {/* Form + contact methods */}
        <section className="mx-auto mt-12 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
            {/* Form */}
            <div className="lg:col-span-2">
              <ContactForm />
            </div>

            {/* Methods */}
            <div className="space-y-4">
              <ul className="space-y-3">
                {CONTACT_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <li key={m.label}>
                      <a
                        href={m.href}
                        className="flex items-start gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{m.label}</span>
                          <span className="block truncate text-sm text-primary">{m.value}</span>
                          <span className="mt-0.5 block text-pretty text-xs text-muted-foreground">{m.note}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>

              <Card className="bg-muted/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    We typically reply within <span className="font-medium text-foreground">one business day</span>.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
