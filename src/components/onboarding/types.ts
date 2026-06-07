// Shared types for the onboarding wizard.

export interface OnboardingData {
  // Step 2: Care recipient
  recipientName: string;
  recipientDateOfBirth: string;
  recipientPhoto: string | null;
  relationship: string;
  // Step 3: Health basics
  conditions: string[];
  allergies: string[];
  primaryLanguage: string;
  timezone: string;
  // Step 4: Invites
  invites: Array<{ email: string; role: string }>;
}

export interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}
