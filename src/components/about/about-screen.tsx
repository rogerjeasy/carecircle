import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { AboutHero } from "./about-hero";
import {
  DifferenceSection,
  PersonasSection,
  PillarsSection,
  PrinciplesSection,
  ProblemSection,
} from "./sections";
import { AboutCta } from "./about-cta";

/** The public About page — wrapped in the marketing chrome. */
export function AboutScreen() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <main className="overflow-x-hidden pb-20 pt-28 sm:pt-32">
        <AboutHero />
        <ProblemSection />
        <DifferenceSection />
        <PersonasSection />
        <PillarsSection />
        <PrinciplesSection />
        <div className="mt-24">
          <AboutCta />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
