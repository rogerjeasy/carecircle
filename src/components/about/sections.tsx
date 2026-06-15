import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { DIFFERENTIATORS, PERSONAS, PILLARS, PRINCIPLES, PROBLEMS } from "./data";

/* --------------------------------- Shared -------------------------------- */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      )}
      <h2 className="text-balance font-serif text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-pretty text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** A reveal-on-enter card with an icon chip, title and body. */
function InfoCard({
  icon: Icon,
  title,
  body,
  index,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  index: number;
  accent?: boolean;
}) {
  return (
    <Card
      className={cn(
        "h-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
        accent && "border-primary/30 bg-primary/5"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms`, animationFillMode: "backwards" }}
    >
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <span
          className={cn(
            "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
            accent ? "bg-primary/15 text-primary" : "bg-secondary text-primary"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <h3 className="font-semibold leading-snug">{title}</h3>
        <p className="mt-1.5 text-pretty text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function SectionWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</section>;
}

/* -------------------------------- Problem -------------------------------- */
export function ProblemSection() {
  const t = useTranslations("about.problem");
  return (
    <SectionWrap className="mt-24">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {PROBLEMS.map((p, i) => (
          <InfoCard key={p.key} icon={p.icon} title={t(`items.${p.key}.title`)} body={t(`items.${p.key}.body`)} index={i} />
        ))}
      </div>
    </SectionWrap>
  );
}

/* ------------------------------ Difference ------------------------------- */
export function DifferenceSection() {
  const t = useTranslations("about.difference");
  return (
    <SectionWrap className="mt-24">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {DIFFERENTIATORS.map((d, i) => (
          <InfoCard key={d.key} icon={d.icon} title={t(`items.${d.key}.title`)} body={t(`items.${d.key}.body`)} index={i} accent />
        ))}
      </div>
    </SectionWrap>
  );
}

/* -------------------------------- Personas ------------------------------- */
export function PersonasSection() {
  const t = useTranslations("about.personas");
  return (
    <SectionWrap className="mt-24">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((persona, i) => {
          const Icon = persona.icon;
          return (
            <Card
              key={persona.key}
              className="h-full motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: "backwards" }}
            >
              <CardContent className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="min-w-0 truncate font-semibold">{t(`items.${persona.key}.name`)}</h3>
                </div>
                <p className="mt-3 text-sm font-medium">{t(`items.${persona.key}.who`)}</p>
                <p className="mt-1 text-pretty text-sm text-muted-foreground">{t(`items.${persona.key}.need`)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </SectionWrap>
  );
}

/* -------------------------------- Pillars -------------------------------- */
export function PillarsSection() {
  const t = useTranslations("about.pillars");
  return (
    <SectionWrap className="mt-24">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p, i) => (
          <InfoCard key={p.key} icon={p.icon} title={t(`items.${p.key}.title`)} body={t(`items.${p.key}.body`)} index={i} />
        ))}
      </div>
    </SectionWrap>
  );
}

/* ------------------------------- Principles ------------------------------ */
export function PrinciplesSection() {
  const t = useTranslations("about.principles");
  return (
    <SectionWrap className="mt-24">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <InfoCard key={p.key} icon={p.icon} title={t(`items.${p.key}.title`)} body={t(`items.${p.key}.body`)} index={i} />
        ))}
      </div>
    </SectionWrap>
  );
}
