"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  User,
  Calendar,
  Camera,
  X,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Users,
  Clock,
  Globe,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// Types
// ============================================================================

interface OnboardingData {
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

const defaultData: OnboardingData = {
  recipientName: "",
  recipientDateOfBirth: "",
  recipientPhoto: null,
  relationship: "",
  conditions: [],
  allergies: [],
  primaryLanguage: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  invites: [],
};

const STORAGE_KEY = "carecircle-onboarding";

// ============================================================================
// Common conditions and allergies for suggestions
// ============================================================================

const commonConditions = [
  "Diabetes",
  "Hypertension",
  "Heart disease",
  "Arthritis",
  "Dementia",
  "Alzheimer's",
  "Parkinson's",
  "COPD",
  "Asthma",
  "Cancer",
  "Stroke",
  "Depression",
];

const commonAllergies = [
  "Penicillin",
  "Sulfa drugs",
  "Aspirin",
  "NSAIDs",
  "Latex",
  "Peanuts",
  "Shellfish",
  "Eggs",
  "Dairy",
  "Gluten",
  "Bee stings",
  "Contrast dye",
];

const relationships = [
  "Parent",
  "Spouse/Partner",
  "Grandparent",
  "Sibling",
  "Child",
  "In-law",
  "Friend",
  "Neighbor",
  "Client",
  "Other",
];

const languages = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "German",
  "Italian",
  "Chinese (Mandarin)",
  "Chinese (Cantonese)",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Tagalog",
  "Arabic",
  "Hindi",
  "Russian",
  "Polish",
  "Other",
];

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
];

const inviteRoles = [
  { value: "family", label: "Family member" },
  { value: "caregiver", label: "Caregiver" },
  { value: "readonly", label: "Read-only" },
];

// ============================================================================
// Step animations
// ============================================================================

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
};

// ============================================================================
// Chip Input Component
// ============================================================================

interface ChipInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
}

function ChipInput({ label, value, onChange, suggestions, placeholder }: ChipInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s)
  );

  const addChip = (chip: string) => {
    if (chip.trim() && !value.includes(chip.trim())) {
      onChange([...value, chip.trim()]);
    }
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeChip = (chip: string) => {
    onChange(value.filter((v) => v !== chip));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeChip(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <div
          className={cn(
            "flex flex-wrap gap-2 rounded-xl border border-input bg-background p-2 min-h-[42px]",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
          )}
          onClick={() => inputRef.current?.focus()}
        >
          {value.map((chip) => (
            <Badge
              key={chip}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {chip}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeChip(chip);
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                aria-label={`Remove ${chip}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border bg-popover p-1 shadow-md max-h-48 overflow-auto">
            {filteredSuggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addChip(suggestion)}
                className="w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-accent/10 focus:bg-accent/10 outline-none"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Step 1: Welcome
// ============================================================================

function Step1Welcome() {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Heart className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-bold text-foreground">
          Welcome to CareCircle
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          You are about to bring your family and care team together in one place.
        </p>
      </div>
      <div className="pt-4">
        <p className="text-primary font-medium">
          Let&apos;s set up care for your loved one.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Care Recipient
// ============================================================================

interface Step2Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

function Step2CareRecipient({ data, updateData }: Step2Props) {
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateData({ recipientPhoto: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">Who are you caring for?</h2>
        <p className="text-muted-foreground">
          Tell us about the person at the center of this care circle.
        </p>
      </div>

      <div className="space-y-4">
        {/* Photo upload */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className={cn(
                "w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden",
                "hover:border-primary/50 transition-colors cursor-pointer"
              )}
            >
              {data.recipientPhoto ? (
                <img
                  src={data.recipientPhoto}
                  alt="Care recipient"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-muted-foreground/50" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Upload photo"
              />
            </div>
            {data.recipientPhoto && (
              <button
                type="button"
                onClick={() => updateData({ recipientPhoto: null })}
                className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Add a photo (optional)
        </p>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="recipientName">Their name *</Label>
          <Input
            id="recipientName"
            placeholder="e.g., Antonio"
            value={data.recipientName}
            onChange={(e) => updateData({ recipientName: e.target.value })}
            autoComplete="off"
          />
        </div>

        {/* Date of birth */}
        <div className="space-y-2">
          <Label htmlFor="recipientDob">Date of birth</Label>
          <Input
            id="recipientDob"
            type="date"
            value={data.recipientDateOfBirth}
            onChange={(e) => updateData({ recipientDateOfBirth: e.target.value })}
          />
        </div>

        {/* Relationship */}
        <div className="space-y-2">
          <Label htmlFor="relationship">Your relationship to them</Label>
          <Select
            value={data.relationship}
            onValueChange={(value) => updateData({ relationship: value })}
          >
            <SelectTrigger id="relationship">
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {relationships.map((rel) => (
                <SelectItem key={rel} value={rel.toLowerCase()}>
                  {rel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Health Basics
// ============================================================================

interface Step3Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

function Step3HealthBasics({ data, updateData }: Step3Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">Health basics</h2>
        <p className="text-muted-foreground">
          This helps your care team provide better support. All fields are optional.
        </p>
      </div>

      <div className="space-y-5">
        {/* Conditions */}
        <ChipInput
          label="Key conditions"
          value={data.conditions}
          onChange={(conditions) => updateData({ conditions })}
          suggestions={commonConditions}
          placeholder="Type or select conditions..."
        />

        {/* Allergies */}
        <ChipInput
          label="Allergies"
          value={data.allergies}
          onChange={(allergies) => updateData({ allergies })}
          suggestions={commonAllergies}
          placeholder="Type or select allergies..."
        />

        {/* Primary language */}
        <div className="space-y-2">
          <Label htmlFor="language">Primary language</Label>
          <Select
            value={data.primaryLanguage}
            onValueChange={(value) => updateData({ primaryLanguage: value })}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang.toLowerCase()}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Time zone</Label>
          <Select
            value={data.timezone}
            onValueChange={(value) => updateData({ timezone: value })}
          >
            <SelectTrigger id="timezone">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 4: Invite Circle
// ============================================================================

interface Step4Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

function Step4InviteCircle({ data, updateData }: Step4Props) {
  const addInvite = () => {
    updateData({
      invites: [...data.invites, { email: "", role: "family" }],
    });
  };

  const updateInvite = (index: number, field: "email" | "role", value: string) => {
    const newInvites = [...data.invites];
    newInvites[index] = { ...newInvites[index], [field]: value };
    updateData({ invites: newInvites });
  };

  const removeInvite = (index: number) => {
    updateData({
      invites: data.invites.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-serif text-2xl font-bold">Invite your circle</h2>
        <p className="text-muted-foreground">
          Add family members, caregivers, or anyone who helps with care.
        </p>
      </div>

      <div className="space-y-4">
        {data.invites.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-xl">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              No invites yet. Add people to your care circle.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.invites.map((invite, index) => (
              <div
                key={index}
                className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl border bg-card"
              >
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={invite.email}
                    onChange={(e) => updateInvite(index, "email", e.target.value)}
                    aria-label={`Email for invite ${index + 1}`}
                  />
                </div>
                <div className="flex gap-2">
                  <Select
                    value={invite.role}
                    onValueChange={(value) => updateInvite(index, "role", value)}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]" aria-label={`Role for invite ${index + 1}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {inviteRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInvite(index)}
                    aria-label="Remove invite"
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={addInvite}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add another person
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          You can always invite more people later from the dashboard.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Step 5: Done
// ============================================================================

interface Step5Props {
  data: OnboardingData;
}

function Step5Done({ data }: Step5Props) {
  const recipientName = data.recipientName || "Your loved one";

  return (
    <div className="text-center space-y-6 py-6">
      <div className="mx-auto w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-success" />
      </div>

      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-bold text-foreground">
          {recipientName}&apos;s Care Circle is ready!
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          You&apos;ve taken the first step toward better coordinated care. Your circle is set up and ready to go.
        </p>
      </div>

      {/* Summary card */}
      <Card className="text-left max-w-sm mx-auto">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {data.recipientPhoto ? (
              <img
                src={data.recipientPhoto}
                alt={recipientName}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold">{recipientName}</p>
              {data.relationship && (
                <p className="text-sm text-muted-foreground capitalize">
                  Your {data.relationship}
                </p>
              )}
            </div>
          </div>

          {(data.conditions.length > 0 || data.allergies.length > 0) && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {data.conditions.slice(0, 3).map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
              {data.allergies.slice(0, 2).map((a) => (
                <Badge key={a} variant="destructive" className="text-xs bg-destructive/10 text-destructive border-0">
                  {a}
                </Badge>
              ))}
              {data.conditions.length + data.allergies.length > 5 && (
                <Badge variant="secondary" className="text-xs">
                  +{data.conditions.length + data.allergies.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {data.invites.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>
                {data.invites.length} invite{data.invites.length !== 1 ? "s" : ""} pending
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="pt-4 space-y-2">
        <p className="text-sm text-muted-foreground">
          What&apos;s next? Start adding medications, appointments, and daily updates.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Onboarding Page
// ============================================================================

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(1);
  const [direction, setDirection] = React.useState(0);
  const [data, setData] = React.useState<OnboardingData>(defaultData);
  const [isLoading, setIsLoading] = React.useState(false);

  const totalSteps = 5;

  // Load persisted data on mount
  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setData({ ...defaultData, ...parsed.data });
        if (parsed.step && parsed.step <= totalSteps) {
          setStep(parsed.step);
        }
      } catch {
        // Invalid data, use defaults
      }
    }
  }, []);

  // Persist data on change
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  }, [step, data]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const canContinue = () => {
    switch (step) {
      case 2:
        return data.recipientName.trim().length > 0;
      default:
        return true;
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleContinue = async () => {
    if (step < totalSteps) {
      setDirection(1);
      setStep(step + 1);
    } else {
      // Complete onboarding
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      localStorage.removeItem(STORAGE_KEY);
      toast.success("Welcome to CareCircle!", {
        description: "Your care circle has been created.",
      });
      router.push("/dashboard");
    }
  };

  const handleSkip = () => {
    setDirection(1);
    setStep(step + 1);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Welcome />;
      case 2:
        return <Step2CareRecipient data={data} updateData={updateData} />;
      case 3:
        return <Step3HealthBasics data={data} updateData={updateData} />;
      case 4:
        return <Step4InviteCircle data={data} updateData={updateData} />;
      case 5:
        return <Step5Done data={data} />;
      default:
        return null;
    }
  };

  const showSkip = step === 3 || step === 4;
  const isFinalStep = step === totalSteps;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="font-semibold">CareCircle</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-lg">
          {/* Progress indicator */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {step} of {totalSteps}
              </span>
              {step > 1 && step < totalSteps && (
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    setData(defaultData);
                    setStep(1);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Start over
                </button>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Step content with animation */}
          <CardContent className="p-4 sm:p-6 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                className="motion-reduce:transition-none motion-reduce:transform-none"
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          {/* Navigation buttons */}
          <div className="p-4 border-t flex items-center gap-3">
            {step > 1 && !isFinalStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}

            <div className="flex-1" />

            {showSkip && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-muted-foreground"
              >
                Skip for now
              </Button>
            )}

            <Button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue() || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </span>
                  Setting up...
                </>
              ) : isFinalStep ? (
                <>
                  Go to dashboard
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}
