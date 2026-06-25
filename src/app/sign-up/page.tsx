"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

type SignUpForm = { fullName: string; email: string; password: string; terms: boolean };

// Password strength calculation — `key` indexes `auth.common.strength`.
function getPasswordStrength(password: string): {
  score: number;
  key: "weak" | "fair" | "good" | "strong";
  color: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, key: "weak", color: "bg-destructive" };
  if (score <= 4) return { score: 2, key: "fair", color: "bg-warning" };
  if (score <= 5) return { score: 3, key: "good", color: "bg-info" };
  return { score: 4, key: "strong", color: "bg-success" };
}

// Password requirements check — `key` indexes `auth.common.requirements`.
function getPasswordRequirements(password: string) {
  return [
    { key: "min8", met: password.length >= 8 },
    { key: "upper", met: /[A-Z]/.test(password) },
    { key: "lower", met: /[a-z]/.test(password) },
    { key: "number", met: /[0-9]/.test(password) },
  ] as const;
}

// Brand Panel Component
function BrandPanel() {
  const t = useTranslations("auth.signUp");
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
          {t("brandHeadline")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          {t("brandSubtitle")}
        </p>
      </div>

      {/* Mission note — what Kintwadi is for (no fabricated testimonials) */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <blockquote className="text-base italic text-foreground/90">
          {t("brandQuote")}
        </blockquote>
        <p className="mt-4 text-xs text-muted-foreground">{t("brandQuoteAttribution")}</p>
      </div>
    </div>
  );
}

// Slim Brand Banner for iPad Portrait
function BrandBanner() {
  const t = useTranslations("auth.signUp");
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
        {t("bannerTagline")}
      </p>

      {/* Theme toggle */}
      <div className="relative z-10">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function SignUpPage() {
  const router = useRouter();
  const tErr = useTranslations("auth.signUp.errors");
  const tToast = useTranslations("auth.signUp");
  // Validation schema — messages localized via the `auth.signUp.errors` namespace.
  const signUpSchema = React.useMemo(
    () =>
      z.object({
        fullName: z.string().min(2, tErr("fullNameMin")).max(100, tErr("fullNameMax")),
        email: z.string().min(1, tErr("emailRequired")).email(tErr("emailInvalid")),
        password: z
          .string()
          .min(8, tErr("passwordMin"))
          .regex(/[A-Z]/, tErr("passwordUpper"))
          .regex(/[a-z]/, tErr("passwordLower"))
          .regex(/[0-9]/, tErr("passwordNumber")),
        terms: z.literal(true, { message: tErr("terms") }),
      }),
    [tErr],
  );

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
      toast.error(tToast("toastErrorTitle"), { description: res.error });
      return;
    }

    toast.success(tToast("toastSuccessTitle"), {
      description: tToast("toastSuccessDesc"),
    });
    // Soft (client-side) navigation so the document never blanks out — a full-document
    // window.location navigation showed a "couldn't load" flash on Vercel and discarded this
    // toast. router.replace keeps the persistent <Toaster> (root layout) mounted and /onboarding
    // fetches fresh authenticated RSC with the session cookie that was just set. isSubmitting
    // stays true so the spinner persists through the transition until this page unmounts.
    router.replace(res.redirectTo ?? "/onboarding");
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
  passwordStrength: { score: number; key: "weak" | "fair" | "good" | "strong"; color: string };
  passwordRequirements: ReadonlyArray<{ key: "min8" | "upper" | "lower" | "number"; met: boolean }>;
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
  const t = useTranslations("auth.signUp");
  const tc = useTranslations("auth.common");
  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Social login buttons + divider (env-gated) */}
      <SocialAuthButtons />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
          <Input
            id="fullName"
            type="text"
            placeholder={t("fullNamePlaceholder")}
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
          <Label htmlFor="password">{tc("passwordLabel")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("passwordPlaceholder")}
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
              aria-label={showPassword ? tc("hidePassword") : tc("showPassword")}
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
                  {tc(`strength.${passwordStrength.key}`)}
                </span>
              </div>

              {/* Password requirements */}
              <ul id="password-requirements" className="space-y-1 text-xs">
                {passwordRequirements.map((req) => (
                  <li
                    key={req.key}
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
                    {tc(`requirements.${req.key}`)}
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
              {t.rich("terms", {
                terms: (chunks) => (
                  <Link href="/terms" className="text-primary hover:underline">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link href="/privacy" className="text-primary hover:underline">
                    {chunks}
                  </Link>
                ),
              })}
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
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>

      {/* Sign in link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
