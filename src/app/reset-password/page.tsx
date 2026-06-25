"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, Check, X, AlertCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { resetPassword } from "@/lib/auth/actions";

// Password requirements — `key` indexes `auth.common.requirements`.
const passwordRequirements = [
  { key: "min8", test: (pwd: string) => pwd.length >= 8 },
  { key: "upper", test: (pwd: string) => /[A-Z]/.test(pwd) },
  { key: "lower", test: (pwd: string) => /[a-z]/.test(pwd) },
  { key: "number", test: (pwd: string) => /\d/.test(pwd) },
] as const;

// Calculate password strength — `key` indexes `auth.common.strength`.
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
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score: 1, key: "weak", color: "bg-destructive" };
  if (score <= 3) return { score: 2, key: "fair", color: "bg-warning" };
  if (score <= 4) return { score: 3, key: "good", color: "bg-info" };
  return { score: 4, key: "strong", color: "bg-success" };
}

type ResetPasswordFormData = { password: string; confirmPassword: string };

// Brand Panel Component
function BrandPanel() {
  const t = useTranslations("auth.reset");
  const tips = ["unique", "manager", "noShare"] as const;
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

      {/* Security tip */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <p className="text-sm font-medium mb-2">{t("securityTipsTitle")}</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          {tips.map((k) => (
            <li key={k}>{t(`tips.${k}`)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Slim Brand Banner for iPad Portrait
function BrandBanner() {
  const t = useTranslations("auth.reset");
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

export default function ResetPasswordPage() {
  const tErr = useTranslations("auth.reset.errors");
  const tToast = useTranslations("auth.reset");
  // Validation schema — messages localized via the `auth.reset.errors` namespace.
  const resetPasswordSchema = React.useMemo(
    () =>
      z
        .object({
          password: z
            .string()
            .min(8, tErr("passwordMin"))
            .regex(/[A-Z]/, tErr("passwordUpper"))
            .regex(/[a-z]/, tErr("passwordLower"))
            .regex(/\d/, tErr("passwordNumber")),
          confirmPassword: z.string().min(1, tErr("confirmRequired")),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: tErr("noMatch"),
          path: ["confirmPassword"],
        }),
    [tErr],
  );

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [formData, setFormData] = React.useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof ResetPasswordFormData, string>>>({});
  const [touched, setTouched] = React.useState<Partial<Record<keyof ResetPasswordFormData, boolean>>>({});
  // The one-time token + user id arrive as ?token=&uid= on the reset link.
  const [link, setLink] = React.useState<{ token: string; uid: string } | null>(null);
  const [linkChecked, setLinkChecked] = React.useState(false);

  React.useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const token = sp.get("token");
    const uid = sp.get("uid");
    if (token && uid) setLink({ token, uid });
    setLinkChecked(true);
  }, []);

  // Validate a single field
  const validateField = (field: keyof ResetPasswordFormData, value: string, allData?: typeof formData) => {
    const dataToValidate = allData || { ...formData, [field]: value };

    try {
      if (field === "confirmPassword") {
        // Special handling for confirm password to check match
        if (dataToValidate.confirmPassword && dataToValidate.password !== dataToValidate.confirmPassword) {
          setErrors((prev) => ({ ...prev, confirmPassword: tErr("noMatch") }));
          return;
        }
      }

      const fieldSchema = resetPasswordSchema.shape[field];
      fieldSchema.parse(value);
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: err.issues[0]?.message }));
      }
    }
  };

  // Handle input change
  const handleChange = (field: keyof ResetPasswordFormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    if (touched[field]) {
      validateField(field, value, newFormData);
    }

    // Also revalidate confirmPassword when password changes
    if (field === "password" && touched.confirmPassword && newFormData.confirmPassword) {
      if (value !== newFormData.confirmPassword) {
        setErrors((prev) => ({ ...prev, confirmPassword: tErr("noMatch") }));
      } else {
        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }
    }
  };

  // Handle blur
  const handleBlur = (field: keyof ResetPasswordFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field]);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      password: true,
      confirmPassword: true,
    });

    // Validate all fields
    const result = resetPasswordSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ResetPasswordFormData, string>> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof ResetPasswordFormData;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    if (!link) {
      toast.error(tToast("toastInvalidLink"));
      return;
    }

    setIsSubmitting(true);

    const fd = new FormData();
    fd.set("token", link.token);
    fd.set("uid", link.uid);
    fd.set("password", formData.password);
    const res = await resetPassword(fd);

    setIsSubmitting(false);

    if (!res.ok) {
      toast.error(tToast("toastErrorTitle"), { description: res.error });
      return;
    }
    setIsSuccess(true);
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  // One element shared by all three responsive layouts: success → invalid link → the form.
  const content = isSuccess ? (
    <SuccessState />
  ) : linkChecked && !link ? (
    <InvalidLinkState />
  ) : (
    <ResetPasswordForm
      formData={formData}
      errors={errors}
      touched={touched}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      showConfirmPassword={showConfirmPassword}
      setShowConfirmPassword={setShowConfirmPassword}
      isSubmitting={isSubmitting}
      passwordStrength={passwordStrength}
      passwordsMatch={passwordsMatch}
      handleChange={handleChange}
      handleBlur={handleBlur}
      handleSubmit={handleSubmit}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop/Tablet Landscape: Two-pane split */}
      <div className="hidden lg:grid lg:min-h-screen lg:grid-cols-2">
        {/* Left: Brand Panel */}
        <BrandPanel />

        {/* Right: Form */}
        <div className="flex flex-col">
          {/* Top bar with theme toggle */}
          <div className="flex justify-end p-4">
            <ThemeToggle />
          </div>

          {/* Centered form */}
          <div className="flex flex-1 items-center justify-center px-8 pb-8">
            {content}
          </div>
        </div>
      </div>

      {/* Tablet Portrait (768-1023px): Banner + Form */}
      <div className="hidden min-h-screen flex-col md:flex lg:hidden">
        {/* Top: Slim Banner */}
        <BrandBanner />

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-8 py-8">
          {content}
        </div>
      </div>

      {/* Mobile: No brand panel, centered form */}
      <div className="flex min-h-screen flex-col md:hidden">
        {/* Top bar with logo and theme toggle */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
          </div>
          <ThemeToggle />
        </div>

        {/* Centered form with padding (not edge-to-edge) */}
        <div className="flex flex-1 items-center justify-center px-5 pb-8">
          {content}
        </div>
      </div>
    </div>
  );
}

// Form Component
interface ResetPasswordFormProps {
  formData: { password: string; confirmPassword: string };
  errors: Partial<Record<keyof ResetPasswordFormData, string>>;
  touched: Partial<Record<keyof ResetPasswordFormData, boolean>>;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  isSubmitting: boolean;
  passwordStrength: { score: number; key: "weak" | "fair" | "good" | "strong"; color: string };
  passwordsMatch: boolean | "" | undefined;
  handleChange: (field: keyof ResetPasswordFormData, value: string) => void;
  handleBlur: (field: keyof ResetPasswordFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

function ResetPasswordForm({
  formData,
  errors,
  touched,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isSubmitting,
  passwordStrength,
  passwordsMatch,
  handleChange,
  handleBlur,
  handleSubmit,
}: ResetPasswordFormProps) {
  const t = useTranslations("auth.reset");
  const tc = useTranslations("auth.common");
  return (
    <div className="w-full max-w-md">
      {/* Back link */}
      <Link
        href="/sign-in"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("backToSignIn")}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t("title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="password">{t("newPasswordLabel")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t("newPasswordPlaceholder")}
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              aria-invalid={touched.password && !!errors.password}
              aria-describedby="password-strength password-requirements"
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

          {/* Password Strength Meter */}
          {formData.password && (
            <div id="password-strength" className="space-y-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{tc("strength.label")}</span>
                <span className={cn(
                  "font-medium",
                  passwordStrength.score === 1 && "text-destructive",
                  passwordStrength.score === 2 && "text-warning",
                  passwordStrength.score === 3 && "text-info",
                  passwordStrength.score === 4 && "text-success"
                )}>
                  {tc(`strength.${passwordStrength.key}`)}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={cn(
                      "h-1.5 flex-1 rounded-full transition-colors duration-200",
                      level <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Password Requirements Checklist */}
          {formData.password && (
            <div id="password-requirements" className="space-y-1.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
              {passwordRequirements.map((req) => {
                const passed = req.test(formData.password);
                return (
                  <div
                    key={req.key}
                    className={cn(
                      "flex items-center gap-2 text-xs transition-colors duration-200",
                      passed ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    {passed ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    {tc(`requirements.${req.key}`)}
                  </div>
                );
              })}
            </div>
          )}

          {touched.password && errors.password && (
            <p className="text-sm text-destructive" role="alert">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("confirmLabel")}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t("confirmPlaceholder")}
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-error" : "confirm-match"}
              className={cn(
                "pr-10",
                touched.confirmPassword && errors.confirmPassword && "border-destructive focus-visible:ring-destructive",
                passwordsMatch && "border-success focus-visible:ring-success"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              aria-label={showConfirmPassword ? tc("hidePassword") : tc("showPassword")}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Match indicator */}
          {formData.confirmPassword && (
            <div
              id="confirm-match"
              className={cn(
                "flex items-center gap-2 text-xs transition-colors duration-200 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
                passwordsMatch ? "text-success" : "text-destructive"
              )}
            >
              {passwordsMatch ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("match")}
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  {t("noMatch")}
                </>
              )}
            </div>
          )}

          {touched.confirmPassword && errors.confirmPassword && !formData.confirmPassword && (
            <p id="confirm-error" className="text-sm text-destructive" role="alert">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !passwordsMatch}
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
    </div>
  );
}

// Invalid / missing reset link
function InvalidLinkState() {
  const t = useTranslations("auth.reset");
  const tc = useTranslations("auth.common");
  return (
    <div className="w-full max-w-md text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>

      {/* Header */}
      <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t("invalid.title")}</h2>
      <p className="mt-3 text-muted-foreground">{t("invalid.desc")}</p>

      {/* Actions */}
      <div className="mt-8 space-y-3">
        <Button asChild className="w-full">
          <Link href="/forgot-password">{t("invalid.action")}</Link>
        </Button>
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {tc("backToSignIn")}
        </Link>
      </div>
    </div>
  );
}

// Success State
function SuccessState() {
  const t = useTranslations("auth.reset.success");
  return (
    <div className="w-full max-w-md text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
      {/* Success icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>

      {/* Header */}
      <h2 className="font-serif text-2xl font-bold sm:text-3xl">{t("title")}</h2>
      <p className="mt-3 text-muted-foreground">{t("desc")}</p>

      {/* Sign in button */}
      <div className="mt-8">
        <Button asChild className="w-full">
          <Link href="/sign-in">{t("continue")}</Link>
        </Button>
      </div>

      {/* Security notice */}
      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
        <p className="text-muted-foreground">{t("securityNotice")}</p>
      </div>
    </div>
  );
}
