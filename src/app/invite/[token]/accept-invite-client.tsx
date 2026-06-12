"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import {
  Heart,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
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
import { signUpWithCredentials } from "@/lib/auth/actions";
import { acceptInvitation, declineInvitation } from "@/lib/invitations/actions";

// The page's display roles (a friendlier projection of the schema's role enum).
export type InviteRole =
  | "coordinator"
  | "family"
  | "caregiver"
  | "readonly"
  | "care-recipient"
  | "clinician";

export interface InviteView {
  token: string;
  inviterName: string;
  inviterInitials: string;
  circleName: string;
  careRecipientName: string;
  assignedRole: InviteRole;
  personalNote?: string;
}

const roleMetadata: Record<
  InviteRole,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    description: string;
    canSee: string[];
  }
> = {
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

const signUpSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[a-z]/, "Include at least one lowercase letter")
    .regex(/[0-9]/, "Include at least one number"),
  terms: z.literal(true, { message: "You must accept the terms to continue" }),
});

type SignUpForm = z.infer<typeof signUpSchema>;

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

export function AcceptInviteClient({
  invite,
  isSignedIn,
  invitedEmail,
}: {
  invite: InviteView;
  isSignedIn: boolean;
  invitedEmail: string;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeclining, setIsDeclining] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: invitedEmail ?? "",
    password: "",
    terms: false,
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof SignUpForm, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof SignUpForm, boolean>>>({});

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordRequirements = getPasswordRequirements(formData.password);

  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(`/invite/${invite.token}`)}`;

  const validateField = (field: keyof SignUpForm, value: string | boolean) => {
    try {
      signUpSchema.shape[field].parse(value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: err.issues[0]?.message }));
      }
    }
  };

  const handleChange = (field: keyof SignUpForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) validateField(field, value);
  };

  const handleBlur = (field: keyof SignUpForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Join the circle once we have an authenticated session.
  const join = async () => {
    const result = await acceptInvitation(invite.token);
    if (!result.ok) {
      setIsSubmitting(false);
      toast.error("Couldn't join the circle", { description: result.error });
      return;
    }
    toast.success("Welcome to the care circle!", {
      description: `You've joined ${invite.circleName}.`,
    });
    // Hard navigation (not router.push) on purpose: the new membership must be reflected in
    // the RLS-scoped dashboard, and a full load guarantees fresh server state. A soft push
    // followed by router.refresh() races — refresh re-renders the current route and cancels
    // the in-flight navigation, leaving the user stuck on the invite page. isSubmitting
    // stays true so the spinner persists until the page unloads.
    window.location.assign("/dashboard");
  };

  // Signed-in users accept directly.
  const handleAcceptSignedIn = async () => {
    setIsSubmitting(true);
    await join();
  };

  // New users: create the account (auto signs in), then accept.
  const handleSignUpAndAccept = async () => {
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

    setIsSubmitting(true);
    const fd = new FormData();
    fd.set("fullName", result.data.fullName);
    fd.set("email", result.data.email);
    fd.set("password", result.data.password);
    const res = await signUpWithCredentials(fd);

    if (!res.ok) {
      setIsSubmitting(false);
      if (/already exists/i.test(res.error)) {
        setErrors((prev) => ({ ...prev, email: res.error }));
        setTouched((prev) => ({ ...prev, email: true }));
        toast.error("You may already have an account", {
          description: "Try signing in to accept this invitation.",
          action: { label: "Sign in", onClick: () => router.push(signInHref) },
        });
        return;
      }
      // Account created but auto sign-in hiccupped — finish by signing in.
      if (/sign in/i.test(res.error)) {
        router.push(signInHref);
        return;
      }
      toast.error("Couldn't create your account", { description: res.error });
      return;
    }

    await join();
  };

  // Really decline on the server: the invitation flips to `declined` and the link is dead from
  // then on (single-use either way) — not just a client-side toast.
  const handleDecline = async () => {
    setIsDeclining(true);
    const result = await declineInvitation(invite.token);
    if (!result.ok) {
      setIsDeclining(false);
      toast.error("Couldn't decline the invitation", { description: result.error });
      return;
    }
    toast.info("Invitation declined", {
      description: "The coordinator can send you a new invitation if you change your mind.",
    });
    router.push("/");
  };

  const roleInfo = roleMetadata[invite.assignedRole];
  const RoleIcon = roleInfo.icon;

  return (
    <Card className="w-full max-w-lg mx-auto overflow-hidden">
      <CardContent className="p-0">
        {/* Invite header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 px-6 py-8 text-center">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
          </div>
          <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-xl font-semibold text-accent ring-4 ring-background">
            {invite.inviterInitials}
          </div>
          <h1 className="relative font-serif text-xl font-bold sm:text-2xl text-balance">
            {invite.inviterName} invited you to help care for {invite.careRecipientName}
          </h1>
          <p className="relative mt-2 text-sm text-muted-foreground">{invite.circleName}</p>
        </div>

        {/* Role badge */}
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", roleInfo.color)}>
              <RoleIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Badge variant="secondary" className="text-xs font-medium">
                {roleInfo.label}
              </Badge>
              <p className="mt-1 text-sm text-muted-foreground">{roleInfo.description}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">What you&apos;ll have access to:</p>
            <div className="flex flex-wrap gap-1.5">
              {roleInfo.canSee.map((item) => (
                <span key={item} className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs">
                  <Check className="h-3 w-3 text-success" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {invite.personalNote && (
            <div className="mt-4 rounded-lg border border-border/50 bg-card p-3">
              <p className="text-sm italic text-foreground/90">&ldquo;{invite.personalNote}&rdquo;</p>
              <p className="mt-2 text-xs text-muted-foreground">— {invite.inviterName}</p>
            </div>
          )}
        </div>

        {/* Sign-up form or direct accept */}
        <div className="px-6 py-6">
          {!isSignedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Create an account to join the care circle
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">Full name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your name"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    onBlur={() => handleBlur("fullName")}
                    aria-invalid={touched.fullName && !!errors.fullName}
                    className={cn("h-9", touched.fullName && errors.fullName && "border-destructive")}
                  />
                  {touched.fullName && errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    onBlur={() => handleBlur("email")}
                    aria-invalid={touched.email && !!errors.email}
                    className={cn("h-9", touched.email && errors.email && "border-destructive")}
                  />
                  {touched.email && errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      onBlur={() => handleBlur("password")}
                      aria-invalid={touched.password && !!errors.password}
                      className={cn("h-9 pr-9", touched.password && errors.password && "border-destructive")}
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

                  {formData.password && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex flex-1 gap-0.5">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-colors",
                              level <= passwordStrength.score ? passwordStrength.color : "bg-muted",
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{passwordStrength.label}</span>
                    </div>
                  )}

                  {formData.password && (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {passwordRequirements.map((req, i) => (
                        <span
                          key={i}
                          className={cn(
                            "text-[10px] flex items-center gap-0.5",
                            req.met ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          {req.met ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}
                          {req.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="terms"
                    checked={formData.terms}
                    onCheckedChange={(checked) => handleChange("terms", !!checked)}
                    aria-invalid={touched.terms && !!errors.terms}
                  />
                  <Label htmlFor="terms" className="text-xs leading-tight text-muted-foreground">
                    I agree to the{" "}
                    <Link href="/terms" className="text-primary hover:underline">Terms</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </Label>
                </div>
                {touched.terms && errors.terms && (
                  <p className="text-xs text-destructive">{errors.terms}</p>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <Link href={signInHref} className="text-primary hover:underline">Sign in</Link>
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center mb-4">
              You&apos;re signed in. Ready to join the care circle?
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <Button
              onClick={isSignedIn ? handleAcceptSignedIn : handleSignUpAndAccept}
              disabled={isSubmitting || isDeclining}
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
                  Accept &amp; join
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={isSubmitting || isDeclining}
              className="flex-1"
            >
              {isDeclining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                "Decline"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
