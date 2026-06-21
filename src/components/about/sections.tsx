import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { RemoteImage } from "@/components/marketing/remote-image";
import { SectionBackdrop } from "@/components/marketing/section-backdrop";
import { ABOUT_IMG } from "@/components/marketing/images";
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

/** A reveal-on-enter card with an icon chip, title and body. Cards alternate their entrance
 *  direction (even from the left, odd from the right). With an `image`, the icon moves onto a
 *  photo banner. */
function InfoCard({
  icon: Icon,
  title,
  body,
  index,
  accent,
  image,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  index: number;
  accent?: boolean;
  image?: string;
}) {
  const dir =
    index % 2 === 0 ? "motion-safe:slide-in-from-left-5" : "motion-safe:slide-in-from-right-5";
  return (
    <Card
      className={cn(
        "h-full overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700",
        dir,
        accent && "border-primary/30 bg-primary/5"
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 80}ms`, animationFillMode: "backwards" }}
    >
      {image && (
        <div className="relative overflow-hidden">
          <RemoteImage src={image} alt="" className="h-36 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          <span className="absolute bottom-2 left-2 flex h-10 w-10 items-center justify-center rounded-xl bg-background/90 text-primary shadow-sm ring-1 ring-border/60 backdrop-blur">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
      )}
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        {!image && (
          <span
            className={cn(
              "mb-4 flex h-11 w-11 items-center justify-center rounded-xl",
              accent ? "bg-primary/15 text-primary" : "bg-secondary text-primary"
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <h3 className="font-semibold leading-snug">{title}</h3>
        <p className="mt-1.5 text-pretty text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function SectionWrap({
  children,
  className,
  bgImage,
  bgFrom = "left",
}: {
  children: React.ReactNode;
  className?: string;
  bgImage?: string;
  bgFrom?: "left" | "right";
}) {
  return (
    <section className={cn("relative isolate mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {bgImage && <SectionBackdrop src={bgImage} from={bgFrom} />}
      {children}
    </section>
  );
}

/* -------------------------------- Problem -------------------------------- */
export function ProblemSection() {
  const t = useTranslations("about.problem");
  return (
    <SectionWrap className="mt-24" bgImage={ABOUT_IMG.problemBg} bgFrom="left">
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
          <InfoCard
            key={d.key}
            icon={d.icon}
            title={t(`items.${d.key}.title`)}
            body={t(`items.${d.key}.body`)}
            index={i}
            accent
            image={ABOUT_IMG.difference[d.key as keyof typeof ABOUT_IMG.difference]}
          />
        ))}
      </div>
    </SectionWrap>
  );
}

/* -------------------------------- Personas ------------------------------- */
export function PersonasSection() {
  const t = useTranslations("about.personas");
  return (
    <SectionWrap className="mt-24" bgImage={ABOUT_IMG.personasBg} bgFrom="right">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((persona, i) => {
          const Icon = persona.icon;
          return (
            <Card
              key={persona.key}
              className={cn(
                "h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700",
                i % 2 === 0 ? "motion-safe:slide-in-from-left-5" : "motion-safe:slide-in-from-right-5"
              )}
              style={{ animationDelay: `${Math.min(i, 8) * 80}ms`, animationFillMode: "backwards" }}
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
    <SectionWrap className="mt-24" bgImage={ABOUT_IMG.pillarsBg} bgFrom="left">
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
    <SectionWrap className="mt-24" bgImage={ABOUT_IMG.principlesBg} bgFrom="right">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRINCIPLES.map((p, i) => (
          <InfoCard key={p.key} icon={p.icon} title={t(`items.${p.key}.title`)} body={t(`items.${p.key}.body`)} index={i} />
        ))}
      </div>
    </SectionWrap>
  );
}
