"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { Heart, Loader2, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { requestPasswordReset } from "@/lib/auth/actions";

// Validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

// Brand Panel Component
function BrandPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-primary/5 p-8 lg:p-12">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-info/10 blur-2xl" />
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
          We all forget sometimes.
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          No worries — we will send you a secure link to reset your password and get you back to your care circle.
        </p>
      </div>

      {/* Support info */}
      <div className="relative z-10 rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <p className="text-sm text-muted-foreground">
          Having trouble accessing your account?{" "}
          <a href="mailto:support@kintwadi.app" className="text-primary hover:underline">
            Contact our support team
          </a>
        </p>
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
        Password recovery
      </p>

      {/* Theme toggle */}
      <div className="relative z-10">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isEmailSent, setIsEmailSent] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);

  // Validate email
  const validateEmail = (value: string) => {
    try {
      forgotPasswordSchema.shape.email.parse(value);
      setError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || "Invalid email");
      }
    }
  };

  // Handle change
  const handleChange = (value: string) => {
    setEmail(value);
    if (touched) {
      validateEmail(value);
    }
  };

  // Handle blur
  const handleBlur = () => {
    setTouched(true);
    validateEmail(email);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setError(result.error.issues[0]?.message || "Invalid email");
      return;
    }

    setIsSubmitting(true);

    const fd = new FormData();
    fd.set("email", email);
    const res = await requestPasswordReset(fd);
    setIsSubmitting(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Always reach the confirmation state — the response is identical whether or not an
    // account exists, so we never reveal which emails are registered.
    setIsEmailSent(true);
  };

  // Handle resend
  const handleResend = async () => {
    setIsSubmitting(true);
    const fd = new FormData();
    fd.set("email", email);
    await requestPasswordReset(fd);
    setIsSubmitting(false);
  };

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
            {isEmailSent ? (
              <EmailSentState email={email} onResend={handleResend} isResending={isSubmitting} />
            ) : (
              <ForgotPasswordForm
                email={email}
                error={error}
                touched={touched}
                isSubmitting={isSubmitting}
                handleChange={handleChange}
                handleBlur={handleBlur}
                handleSubmit={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tablet Portrait (768-1023px): Banner + Form */}
      <div className="hidden min-h-screen flex-col md:flex lg:hidden">
        {/* Top: Slim Banner */}
        <BrandBanner />

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-8 py-8">
          {isEmailSent ? (
            <EmailSentState email={email} onResend={handleResend} isResending={isSubmitting} />
          ) : (
            <ForgotPasswordForm
              email={email}
              error={error}
              touched={touched}
              isSubmitting={isSubmitting}
              handleChange={handleChange}
              handleBlur={handleBlur}
              handleSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      {/* Mobile: No brand panel, centered form */}
      <div className="flex min-h-screen flex-col md:hidden">
        {/* Top bar with logo and theme toggle */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <Heart className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold">Kintwadi</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Centered form with padding (not edge-to-edge) */}
        <div className="flex flex-1 items-center justify-center px-5 pb-8">
          {isEmailSent ? (
            <EmailSentState email={email} onResend={handleResend} isResending={isSubmitting} />
          ) : (
            <ForgotPasswordForm
              email={email}
              error={error}
              touched={touched}
              isSubmitting={isSubmitting}
              handleChange={handleChange}
              handleBlur={handleBlur}
              handleSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Form Component
interface ForgotPasswordFormProps {
  email: string;
  error: string | null;
  touched: boolean;
  isSubmitting: boolean;
  handleChange: (value: string) => void;
  handleBlur: () => void;
  handleSubmit: (e: React.FormEvent) => void;
}

function ForgotPasswordForm({
  email,
  error,
  touched,
  isSubmitting,
  handleChange,
  handleBlur,
  handleSubmit,
}: ForgotPasswordFormProps) {
  return (
    <div className="w-full max-w-md">
      {/* Back link */}
      <Link
        href="/sign-in"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold sm:text-3xl">Forgot your password?</h2>
        <p className="mt-2 text-muted-foreground">
          No problem. Enter your email address and we will send you a link to reset it.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="maria@example.com"
            value={email}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            aria-invalid={touched && !!error}
            aria-describedby={error ? "email-error" : undefined}
            className={cn(
              touched && error && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {touched && error && (
            <p id="email-error" className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send reset link
            </>
          )}
        </Button>
      </form>

      {/* Sign up link */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {"Remember your password? "}
        <Link
          href="/sign-in"
          className="font-medium text-primary hover:text-primary/90 focus:outline-none focus-visible:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

// Email Sent Success State
interface EmailSentStateProps {
  email: string;
  onResend: () => void;
  isResending: boolean;
}

function EmailSentState({ email, onResend, isResending }: EmailSentStateProps) {
  return (
    <div className="w-full max-w-md text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
      {/* Success icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>

      {/* Header */}
      <h2 className="font-serif text-2xl font-bold sm:text-3xl">Check your inbox</h2>
      <p className="mt-3 text-muted-foreground">
        We sent a password reset link to{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

      {/* Instructions */}
      <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4 text-left text-sm">
        <p className="text-muted-foreground">
          Click the link in the email to create a new password. The link will expire in 1 hour.
        </p>
      </div>

      {/* Resend button */}
      <div className="mt-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          {"Didn't receive the email? Check your spam folder or"}
        </p>
        <Button
          variant="outline"
          onClick={onResend}
          disabled={isResending}
          className="w-full"
        >
          {isResending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resending...
            </>
          ) : (
            "Resend email"
          )}
        </Button>
      </div>

      {/* Back to sign in */}
      <Link
        href="/sign-in"
        className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}
