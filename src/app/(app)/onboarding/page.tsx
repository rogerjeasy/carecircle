import { OnboardingWizard } from "@/components/onboarding";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  // `?from=signup` is set only by the sign-up redirect, so the "Skip onboarding" shortcut appears
  // exclusively on the first-run, post-signup visit — not when a user opens onboarding any other way.
  const { from } = await searchParams;
  return <OnboardingWizard canSkip={from === "signup"} />;
}
