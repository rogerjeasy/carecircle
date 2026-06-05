"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import {
  Heart,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Clock,
  AlertCircle,
  Users,
  Shield,
  Stethoscope,
  UserCheck,
  BookOpen,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

// Role types and metadata
type InviteRole = "coordinator" | "family" | "caregiver" | "readonly" | "care-recipient" | "clinician";

const roleMetadata: Record<InviteRole, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  canSee: string[];
}> = {
  coordinator: {
    label: "Coordinator",
    icon: Shield,
    color: "bg-primary/10 text-primary",
    description: "Full access to manage the care circle, invite members, and configure settings.",
    canSee: ["All care activities", "Member management", "Settings & permissions", "All documents"],
  },
  family: {
    label: "Family member",
    icon: Home,
    color: "bg-accent/10 text-accent",
    description: "Stay connected with your loved one's care from anywhere in the world.",
    canSee: ["Daily timeline", "Medications", "Appointments", "Health updates", "AI Digest"],
  },
  caregiver: {
    label: "Caregiver",
    icon: UserCheck,
    color: "bg-success/10 text-success",
    description: "Record care activities and stay coordinated with the care team.",
    canSee: ["Task assignments", "Medication schedules", "Daily timeline", "Care documents"],
  },
  readonly: {
    label: "Read-only",
    icon: BookOpen,
    color: "bg-muted text-muted-foreground",
    description: "View-only access to stay informed about care progress.",
    canSee: ["Timeline (view only)", "Health summaries", "Documents"],
  },
  "care-recipient": {
    label: "Care recipient",
    icon: Heart,
    color: "bg-info/10 text-info",
    description: "See your own care schedule and stay connected with your care team.",
    canSee: ["Your schedule", "Medications", "Appointments", "Messages from family"],
  },
  clinician: {
    label: "Clinician",
    icon: Stethoscope,
    color: "bg-warning/10 text-warning",
    description: "Clinical access for healthcare providers involved in care.",
    canSee: ["Health records", "Medications", "Clinical documents", "Care timeline"],
  },
};

// Simulated invite data (in real app, fetched from API)
interface InviteData {
  id: string;
  inviterName: string;
  inviterInitials: string;
  inviterRole: string;
  circleName: string;
  careRecipientName: string;
  assignedRole: InviteRole;
  personalNote?: string;
  expiresAt: Date;
  isValid: boolean;
}

function getInviteData(token: string): InviteData | null {
  // Simulate different invite states based on token
  if (token === "expired") {
    return {
      id: "inv_expired",
      inviterName: "Maria Rodriguez",
      inviterInitials: "MR",
      inviterRole: "Coordinator",
      circleName: "Rodriguez Family Circle",
      careRecipientName: "Antonio",
      assignedRole: "family",
      expiresAt: new Date(Date.now() - 86400000), // Expired yesterday
      isValid: false,
    };
  }
  
  if (token === "invalid") {
    return null;
  }

  // Valid invite
  return {
    id: "inv_valid",
    inviterName: "Maria Rodriguez",
    inviterInitials: "MR",
    inviterRole: "Coordinator",
    circleName: "Rodriguez Family Circle",
    careRecipientName: "Antonio",
    assignedRole: (token === "caregiver" ? "caregiver" : token === "clinician" ? "clinician" : "family") as InviteRole,
    personalNote: "We'd love to have you help coordinate Dad's care. Your support means everything to our family.",
    expiresAt: new Date(Date.now() + 7 * 86400000), // Expires in 7 days
    isValid: true,
  };
}

// Validation schema for inline sign-up
const signUpSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  terms: z.literal(true, {
    message: "You must accept the terms to continue",
  }),
});

type SignUpForm = z.infer<typeof signUpSchema>;

// Password strength
function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, label: "Weak", color: "bg-destructive" };
  if (score <= 4) return { score: 2, label: "Fair", color: "bg-warning" };
  if (score <= 5) return { score: 3, label: "Good", color: "bg-info" };
  return { score: 4, label: "Strong", color: "bg-success" };
}

function getPasswordRequirements(password: string) {
  return [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ];
}

export default function AcceptInvitePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [invite, setInvite] = React.useState<InviteData | null | undefined>(undefined);
  const [isSignedIn] = React.useState(false); // In real app, check auth state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: "",
    terms: false,
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof SignUpForm, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof SignUpForm, boolean>>>({});

  // Load invite data
  React.useEffect(() => {
    // Simulate API call
    const data = getInviteData(token);
    setInvite(data);
  }, [token]);

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordRequirements = getPasswordRequirements(formData.password);

  // Validation
  const validateField = (field: keyof SignUpForm, value: string | boolean) => {
    try {
      const fieldSchema = signUpSchema.shape[field];
      fieldSchema.parse(value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: err.issues[0]?.message }));
      }
    }
  };

  const handleChange = (field: keyof SignUpForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleBlur = (field: keyof SignUpForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Accept invitation
  const handleAccept = async () => {
    if (!isSignedIn) {
      // Validate sign-up form
      setTouched({ fullName: true, email: true, password: true, terms: true });
      const result = signUpSchema.safeParse(formData);
      
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof SignUpForm, string>> = {};
        result.error.issues.forEach((err) => {
          const field = err.path[0] as keyof SignUpForm;
          if (!fieldErrors[field]) fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    
    toast.success("Welcome to the care circle!", {
      description: `You've joined ${invite?.circleName}. Redirecting to dashboard...`,
    });

    // In real app, redirect to dashboard
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
  };

  // Decline invitation
  const handleDecline = () => {
    toast.info("Invitation declined", {
      description: "You can always ask to be invited again later.",
    });
    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  };

  // Loading state
  if (invite === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid/expired invite
  if (!invite || !invite.isValid) {
    return (
      <div className="min-h-screen bg-background">
        <InviteLayout>
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="pt-8 pb-8 px-6 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                {!invite ? (
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <Clock className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <h1 className="font-serif text-2xl font-bold mb-2">
                {!invite ? "Invitation not found" : "Invitation expired"}
              </h1>
              <p className="text-muted-foreground mb-6">
                {!invite
                  ? "This invitation link is invalid or has already been used. Please ask the circle coordinator to send you a new invitation."
                  : "This invitation has expired. Please contact the person who invited you to request a new link."}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild>
                  <Link href="/">Go to homepage</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </InviteLayout>
      </div>
    );
  }

  const roleInfo = roleMetadata[invite.assignedRole];
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-screen bg-background">
      <InviteLayout>
        <Card className="w-full max-w-lg mx-auto overflow-hidden">
          <CardContent className="p-0">
            {/* Invite header with warm gradient */}
            <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 px-6 py-8 text-center">
              {/* Decorative elements */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
              </div>

              {/* Inviter avatar */}
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-xl font-semibold text-accent ring-4 ring-background">
                {invite.inviterInitials}
              </div>

              {/* Invitation message */}
              <h1 className="relative font-serif text-xl font-bold sm:text-2xl text-balance">
                {invite.inviterName} invited you to help care for {invite.careRecipientName}
              </h1>
              <p className="relative mt-2 text-sm text-muted-foreground">
                {invite.circleName}
              </p>
            </div>

            {/* Role badge and description */}
            <div className="border-b border-border px-6 py-5">
              <div className="flex items-start gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", roleInfo.color)}>
                  <RoleIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-medium">
                      {roleInfo.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roleInfo.description}
                  </p>
                </div>
              </div>

              {/* What you'll see */}
              <div className="mt-4 rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  What you&apos;ll have access to:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {roleInfo.canSee.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs"
                    >
                      <Check className="h-3 w-3 text-success" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Personal note */}
              {invite.personalNote && (
                <div className="mt-4 rounded-lg border border-border/50 bg-card p-3">
                  <p className="text-sm italic text-foreground/90">
                    &ldquo;{invite.personalNote}&rdquo;
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    — {invite.inviterName}
                  </p>
                </div>
              )}
            </div>

            {/* Sign up form or action buttons */}
            <div className="px-6 py-6">
              {!isSignedIn ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Create an account to join the care circle
                  </p>

                  {/* Compact sign-up form */}
                  <div className="space-y-3">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName" className="text-xs">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your name"
                        value={formData.fullName}
                        onChange={(e) => handleChange("fullName", e.target.value)}
                        onBlur={() => handleBlur("fullName")}
                        aria-invalid={touched.fullName && !!errors.fullName}
                        className={cn(
                          "h-9",
                          touched.fullName && errors.fullName && "border-destructive"
                        )}
                      />
                      {touched.fullName && errors.fullName && (
                        <p className="text-xs text-destructive">{errors.fullName}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        onBlur={() => handleBlur("email")}
                        aria-invalid={touched.email && !!errors.email}
                        className={cn(
                          "h-9",
                          touched.email && errors.email && "border-destructive"
                        )}
                      />
                      {touched.email && errors.email && (
                        <p className="text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-xs">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={formData.password}
                          onChange={(e) => handleChange("password", e.target.value)}
                          onBlur={() => handleBlur("password")}
                          aria-invalid={touched.password && !!errors.password}
                          className={cn(
                            "h-9 pr-9",
                            touched.password && errors.password && "border-destructive"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Compact strength meter */}
                      {formData.password && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex flex-1 gap-0.5">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className={cn(
                                  "h-1 flex-1 rounded-full transition-colors",
                                  level <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {passwordStrength.label}
                          </span>
                        </div>
                      )}

                      {/* Compact requirements */}
                      {formData.password && (
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                          {passwordRequirements.map((req, i) => (
                            <span
                              key={i}
                              className={cn(
                                "text-[10px] flex items-center gap-0.5",
                                req.met ? "text-success" : "text-muted-foreground"
                              )}
                            >
                              {req.met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                              {req.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Terms */}
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="terms"
                        checked={formData.terms}
                        onCheckedChange={(checked) => handleChange("terms", !!checked)}
                        aria-invalid={touched.terms && !!errors.terms}
                      />
                      <Label htmlFor="terms" className="text-xs leading-tight text-muted-foreground">
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline">
                          Terms
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                    {touched.terms && errors.terms && (
                      <p className="text-xs text-destructive">{errors.terms}</p>
                    )}
                  </div>

                  {/* Already have an account */}
                  <p className="text-xs text-center text-muted-foreground">
                    Already have an account?{" "}
                    <Link href={`/sign-in?redirect=/invite/${token}`} className="text-primary hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center mb-4">
                  You&apos;re signed in. Ready to join the care circle?
                </p>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                <Button
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Accept & join
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </InviteLayout>
    </div>
  );
}

// Layout wrapper for invite page
function InviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-4 sm:p-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Heart className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold">CareCircle</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Content - centered with max-width on tablet+ */}
      <main className="flex flex-1 items-center justify-center px-4 pb-8 sm:px-6 md:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-muted-foreground">
        <p>
          Need help?{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </footer>
    </div>
  );
}
