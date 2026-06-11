"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Heart, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { signUpWithCredentials } from "@/lib/auth/actions";

// Validation schema
const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, "Please enter your full name")
    .max(100, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
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

// Password strength calculation
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
} {
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

// Password requirements check
function getPasswordRequirements(password: string) {
  return [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number", met: /[0-9]/.test(password) },
  ];
}

// Brand Panel Component
function BrandPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-primary/5 p-8 lg:p-12">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-success/10 blur-2xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
          <Heart className="h-5 w-5" />
        </span>
        <span className="text-xl font-semibold">Kintwadi</span>
      </div>

      {/* Main content */}
      <div className="relative z-10 space-y-6">
        <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight lg:text-4xl xl:text-5xl text-balance">
          Bring your family into the care.
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Join thousands of families coordinating care for their loved ones — together, no matter the distance.
        </p>
      </div>

      {/* Testimonial */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <blockquote className="text-base italic text-foreground/90">
          &ldquo;Kintwadi finally gave our family a way to stay connected around Dad&apos;s care. 
          My brother in London and I in Toronto now feel like we&apos;re truly in this together.&rdquo;
        </blockquote>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent">
            MR
          </div>
          <div>
            <p className="text-sm font-medium">Maria Rodriguez</p>
            <p className="text-xs text-muted-foreground">Family Coordinator, Toronto</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slim Brand Banner for iPad Portrait
function BrandBanner() {
  return (
    <div className="relative flex items-center justify-between gap-4 overflow-hidden bg-primary/5 px-6 py-4">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
          <Heart className="h-4 w-4" />
        </span>
        <span className="text-lg font-semibold">Kintwadi</span>
      </div>

      {/* Tagline */}
      <p className="relative z-10 hidden text-sm text-muted-foreground sm:block">
        Coordinate care together
      </p>

      {/* Theme toggle */}
      <div className="relative z-10">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    fullName: "",
    email: "",
    password: "",
    terms: false,
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof SignUpForm, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof SignUpForm, boolean>>>({});

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordRequirements = getPasswordRequirements(formData.password);

  // Validate a single field
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

  // Handle input change
  const handleChange = (field: keyof SignUpForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  // Handle blur
  const handleBlur = (field: keyof SignUpForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      fullName: true,
      email: true,
      password: true,
      terms: true,
    });

    // Validate all fields
    const result = signUpSchema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignUpForm, string>> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof SignUpForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
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
      // Surface "email already exists" inline next to the email field; toast the rest.
      if (/already exists/i.test(res.error)) {
        setErrors((prev) => ({ ...prev, email: res.error }));
        setTouched((prev) => ({ ...prev, email: true }));
      }
      toast.error("Couldn't create your account", { description: res.error });
      return;
    }

    toast.success("Welcome to Kintwadi!", {
      description: "Your account has been created successfully.",
    });
    // Hard navigation (not router.push) on purpose: a full request guarantees the freshly
    // set session cookie is sent so /onboarding renders authenticated. A soft push followed
    // by router.refresh() races — refresh re-renders the current route and cancels the
    // in-flight navigation, leaving the user stuck on /sign-up. isSubmitting stays true so
    // the spinner persists until the page unloads.
    window.location.assign("/onboarding");
  };

  // The form renders exactly ONCE; only the surrounding chrome (brand panel / banner / logo bar)
  // swaps per breakpoint. Per-breakpoint form copies would duplicate id="email"/"password" in the
  // DOM, breaking label association, screen readers, and password-manager autofill.
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      {/* Left: Brand Panel — desktop only */}
      <div className="hidden lg:block">
        <BrandPanel />
      </div>

      {/* Right column */}
      <div className="flex min-h-screen flex-col">
        {/* Tablet Portrait (768-1023px): slim brand banner */}
        <div className="hidden md:block lg:hidden">
          <BrandBanner />
        </div>

        {/* Mobile: logo + theme toggle */}
        <div className="flex items-center justify-between p-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold">Kintwadi</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Desktop: theme toggle row */}
        <div className="hidden justify-end p-4 lg:flex">
          <ThemeToggle />
        </div>

        {/* Centered form — the single instance */}
        <div className="flex flex-1 items-center justify-center px-5 pb-8 md:px-8 md:py-8 lg:py-0 lg:pb-8">
          <SignUpForm
            formData={formData}
            errors={errors}
            touched={touched}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isSubmitting={isSubmitting}
            passwordStrength={passwordStrength}
            passwordRequirements={passwordRequirements}
            handleChange={handleChange}
            handleBlur={handleBlur}
            handleSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

// Form Component
interface SignUpFormProps {
  formData: { fullName: string; email: string; password: string; terms: boolean };
  errors: Partial<Record<keyof SignUpForm, string>>;
  touched: Partial<Record<keyof SignUpForm, boolean>>;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
  passwordStrength: { score: number; label: string; color: string };
  passwordRequirements: { label: string; met: boolean }[];
  handleChange: (field: keyof SignUpForm, value: string | boolean) => void;
  handleBlur: (field: keyof SignUpForm) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

function SignUpForm({
  formData,
  errors,
  touched,
  showPassword,
  setShowPassword,
  isSubmitting,
  passwordStrength,
  passwordRequirements,
  handleChange,
  handleBlur,
  handleSubmit,
}: SignUpFormProps) {
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">Create your account</h2>
        <p className="mt-2 text-muted-foreground">
          Start coordinating care with your family today
        </p>
      </div>

      {/* Social login buttons + divider (env-gated) */}
      <SocialAuthButtons />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Maria Rodriguez"
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            onBlur={() => handleBlur("fullName")}
            aria-invalid={touched.fullName && !!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            className={cn(
              touched.fullName && errors.fullName && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {touched.fullName && errors.fullName && (
            <p id="fullName-error" className="text-sm text-destructive" role="alert">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="maria@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            aria-invalid={touched.email && !!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={cn(
              touched.email && errors.email && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {touched.email && errors.email && (
            <p id="email-error" className="text-sm text-destructive" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              aria-invalid={touched.password && !!errors.password}
              aria-describedby="password-requirements"
              className={cn(
                "pr-10",
                touched.password && errors.password && "border-destructive focus-visible:ring-destructive"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Password strength meter */}
          {formData.password && (
            <div className="space-y-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-colors",
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {passwordStrength.label}
                </span>
              </div>

              {/* Password requirements */}
              <ul id="password-requirements" className="space-y-1 text-xs">
                {passwordRequirements.map((req, i) => (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-1.5 transition-colors",
                      req.met ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    {req.met ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                    {req.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {touched.password && errors.password && !formData.password && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Terms checkbox */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={formData.terms}
              onCheckedChange={(checked) => handleChange("terms", checked === true)}
              aria-invalid={touched.terms && !!errors.terms}
              aria-describedby={errors.terms ? "terms-error" : undefined}
            />
            <Label
              htmlFor="terms"
              className="text-sm font-normal leading-relaxed cursor-pointer"
            >
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </Label>
          </div>
          {touched.terms && errors.terms && (
            <p id="terms-error" className="text-sm text-destructive" role="alert">
              {errors.terms}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {/* Sign in link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
