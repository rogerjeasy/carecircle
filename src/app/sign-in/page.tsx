"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons";
import { signInWithCredentials } from "@/lib/auth/actions";

type SignInForm = { email: string; password: string };

// Stat strip — values + labels from messages.
const STAT_KEYS = ["people", "age", "growth"] as const;

// Brand Panel Component (same as sign-up but with different headline)
function BrandPanel() {
  const t = useTranslations("auth.signIn");
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
        <BrandLogo size="lg" />
      </div>

      {/* Main content */}
      <div className="relative z-10 space-y-6">
        <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight lg:text-4xl xl:text-5xl text-balance">
          {t("brandHeadline")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          {t("brandSubtitle")}
        </p>
      </div>

      {/* Why it matters — real demographic context (UN World Population Ageing), not fabricated traction */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-4 text-center">
          {STAT_KEYS.map((k) => (
            <div key={k}>
              <p className="text-2xl font-bold text-primary">{t(`stats.${k}.value`)}</p>
              <p className="text-xs text-muted-foreground">{t(`stats.${k}.label`)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Slim Brand Banner for iPad Portrait
function BrandBanner() {
  const t = useTranslations("auth.signIn");
  return (
    <div className="relative flex items-center justify-between gap-4 overflow-hidden bg-primary/5 px-6 py-4">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-accent/10 blur-2xl" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2">
        <BrandLogo size="md" />
      </div>

      {/* Tagline */}
      <p className="relative z-10 hidden text-sm text-muted-foreground sm:block">
        {t("bannerTagline")}
      </p>

      {/* Theme toggle */}
      <div className="relative z-10">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const tErr = useTranslations("auth.signIn.errors");
  const tToast = useTranslations("auth.signIn");
  // Validation schema — messages localized via the `auth.signIn.errors` namespace.
  const signInSchema = React.useMemo(
    () =>
      z.object({
        email: z.string().min(1, tErr("emailRequired")).email(tErr("emailInvalid")),
        password: z.string().min(1, tErr("passwordRequired")),
      }),
    [tErr],
  );

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
    // Forward any ?callbackUrl the route proxy set so a successful sign-in returns the user to
    // where they were headed. The server action sanitizes it to a same-origin path — a crafted
    // ?callbackUrl=https://evil.example must never become an open redirect (phishing vector).
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
    if (callbackUrl) fd.set("callbackUrl", callbackUrl);

    const res = await signInWithCredentials(fd);

    if (!res.ok) {
      setIsSubmitting(false);
      setCredentialsError(res.error);
      return;
    }

    toast.success(tToast("toastTitle"), {
      description: tToast("toastDesc"),
    });
    // Soft (client-side) navigation to the destination the sign-in action already resolved
    // (admin vs dashboard, or a sanitized callbackUrl). A full-document navigation
    // (window.location) blanks the page — on Vercel that showed a "couldn't load" flash and
    // discarded this toast before it was visible. router.replace keeps the document mounted, so
    // the persistent <Toaster> (root layout) keeps showing the toast, and the protected
    // destination fetches fresh authenticated RSC with the session cookie that was just set.
    // isSubmitting stays true so the spinner persists through the transition until this page
    // unmounts. `replace` (not push) keeps /sign-in out of history.
    router.replace(res.redirectTo ?? "/dashboard");
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
            <BrandLogo size="sm" />
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
  const t = useTranslations("auth.signIn");
  const tc = useTranslations("auth.common");
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
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
          <Label htmlFor="email">{tc("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={tc("emailPlaceholder")}
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
            <Label htmlFor="password">{tc("passwordLabel")}</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary/90 focus:outline-none focus-visible:underline"
            >
              {t("forgotPassword")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
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
              aria-label={showPassword ? tc("hidePassword") : tc("showPassword")}
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
            {t("rememberMe")}
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
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary hover:text-primary/90 focus:outline-none focus-visible:underline"
        >
          {t("signUpLink")}
        </Link>
      </p>
    </div>
  );
}
