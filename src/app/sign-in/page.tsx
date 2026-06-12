"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Heart, Loader2, AlertCircle } from "lucide-react";
import { cn, safeInternalPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { DemoAccountsPanel } from "@/components/auth/demo-accounts";
import { signInWithCredentials, resolveLandingPath } from "@/lib/auth/actions";

// Validation schema
const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

// Brand Panel Component (same as sign-up but with different headline)
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
          Welcome back to your care circle.
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Your family is waiting. Sign in to see the latest updates and keep the care going.
        </p>
      </div>

      {/* Stats/Trust indicators */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">10K+</p>
            <p className="text-xs text-muted-foreground">Families</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">40+</p>
            <p className="text-xs text-muted-foreground">Countries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">99.9%</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
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
        Welcome back
      </p>

      {/* Theme toggle */}
      <div className="relative z-10">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(false);
  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof SignInForm, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof SignInForm, boolean>>>({});
  const [credentialsError, setCredentialsError] = React.useState<string | null>(null);

  // Validate a single field
  const validateField = (field: keyof SignInForm, value: string) => {
    try {
      const fieldSchema = signInSchema.shape[field];
      fieldSchema.parse(value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: err.issues[0]?.message }));
      }
    }
  };

  // Handle input change
  const handleChange = (field: keyof SignInForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setCredentialsError(null); // Clear credentials error on any change
    if (touched[field]) {
      validateField(field, value);
    }
  };

  // Handle blur
  const handleBlur = (field: keyof SignInForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialsError(null);

    // Mark all fields as touched
    setTouched({
      email: true,
      password: true,
    });

    // Validate all fields
    const result = signInSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof SignInForm, string>> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof SignInForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const fd = new FormData();
    fd.set("email", result.data.email);
    fd.set("password", result.data.password);
    const res = await signInWithCredentials(fd);

    if (!res.ok) {
      setIsSubmitting(false);
      setCredentialsError(res.error);
      return;
    }

    toast.success("Welcome back!", {
      description: "You have been signed in successfully.",
    });
    // Honor a ?callbackUrl set by the route proxy; otherwise let the server decide the landing
    // page from the verified session (platform admins → /admin, everyone else → /dashboard).
    // 🔒 Sanitized to a same-origin path — a crafted ?callbackUrl=https://evil.example must
    // never turn a successful sign-in into an open redirect (phishing vector).
    const callbackUrl = safeInternalPath(
      new URLSearchParams(window.location.search).get("callbackUrl"),
    );
    const destination = callbackUrl || (await resolveLandingPath());
    // Hard navigation (not router.push) on purpose: a full request guarantees the freshly
    // set session cookie is sent and the protected destination renders authenticated. A soft
    // push followed by router.refresh() races — refresh re-renders the current route and
    // cancels the in-flight navigation, leaving the user stuck on /sign-in. isSubmitting
    // stays true so the spinner persists until the page unloads.
    window.location.assign(destination);
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
          <SignInForm
            formData={formData}
            errors={errors}
            touched={touched}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            isSubmitting={isSubmitting}
            rememberMe={rememberMe}
            setRememberMe={setRememberMe}
            credentialsError={credentialsError}
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
interface SignInFormProps {
  formData: { email: string; password: string };
  errors: Partial<Record<keyof SignInForm, string>>;
  touched: Partial<Record<keyof SignInForm, boolean>>;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  isSubmitting: boolean;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
  credentialsError: string | null;
  handleChange: (field: keyof SignInForm, value: string) => void;
  handleBlur: (field: keyof SignInForm) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

function SignInForm({
  formData,
  errors,
  touched,
  showPassword,
  setShowPassword,
  isSubmitting,
  rememberMe,
  setRememberMe,
  credentialsError,
  handleChange,
  handleBlur,
  handleSubmit,
}: SignInFormProps) {
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">Sign in to your account</h2>
        <p className="mt-2 text-muted-foreground">
          Welcome back! Please enter your details.
        </p>
      </div>

      {/* Credentials error alert */}
      {credentialsError && (
        <div
          className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p>{credentialsError}</p>
        </div>
      )}

      {/* Social login buttons + divider (env-gated) */}
      <SocialAuthButtons />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/90 focus:outline-none focus-visible:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              aria-invalid={touched.password && !!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
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
          {touched.password && errors.password && (
            <p id="password-error" className="text-sm text-destructive" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <Label
            htmlFor="remember"
            className="text-sm font-normal text-muted-foreground cursor-pointer"
          >
            Remember me for 30 days
          </Label>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {"Don't have an account? "}
        <Link
          href="/sign-up"
          className="font-medium text-primary hover:text-primary/90 focus:outline-none focus-visible:underline"
        >
          Sign up
        </Link>
      </p>

      {/* One-click demo personas (renders only when NEXT_PUBLIC_DEMO_MODE=1) */}
      <DemoAccountsPanel />
    </div>
  );
}
