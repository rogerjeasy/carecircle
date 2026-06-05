import { MarketingHeader } from "@/components/marketing/marketing-header";
import { HeroSection, SocialProofSection } from "@/components/marketing/hero-section";
import { ProblemSolutionSection, FeaturesSection } from "@/components/marketing/features-section";
import {
  MoreFeaturesSection,
  HowItWorksSection,
  TrustSection,
  TestimonialSection,
  CtaSection,
} from "@/components/marketing/more-sections";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <HeroSection />
      <SocialProofSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <MoreFeaturesSection />
      <HowItWorksSection />
      <TrustSection />
      <TestimonialSection />
      <CtaSection />
      <MarketingFooter />
    </main>
  );
}
