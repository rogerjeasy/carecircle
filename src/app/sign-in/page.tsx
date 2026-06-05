"use client";

import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Heart, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";

// Validation schema
const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

// Google Icon
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

// Apple Icon
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

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
        <span className="text-xl font-semibold">CareCircle</span>
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
        <span className="text-lg font-semibold">CareCircle</span>
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
        setErrors((prev) => ({ ...prev, [field]: err.errors[0]?.message }));
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
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof SignInForm;
        if (!fieldErrors[field]) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    // Simulate API call with potential failure
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate invalid credentials for demo (use test@fail.com to trigger error)
    if (formData.email === "test@fail.com") {
      setIsSubmitting(false);
      setCredentialsError("Invalid email or password. Please try again.");
      return;
    }

    setIsSubmitting(false);
    toast.success("Welcome back!", {
      description: "You have been signed in successfully.",
    });
  };

  // Handle social login
  const handleSocialLogin = (provider: string) => {
    toast.info(`${provider} sign-in`, {
      description: `Redirecting to ${provider}...`,
    });
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    toast.info("Password reset", {
      description: "Check your email for reset instructions.",
    });
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
              handleSocialLogin={handleSocialLogin}
              handleForgotPassword={handleForgotPassword}
            />
          </div>
        </div>
      </div>

      {/* Tablet Portrait (768-1023px): Banner + Form */}
      <div className="hidden min-h-screen flex-col md:flex lg:hidden">
        {/* Top: Slim Banner */}
        <BrandBanner />

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-8 py-8">
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
            handleSocialLogin={handleSocialLogin}
            handleForgotPassword={handleForgotPassword}
          />
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
            <span className="text-lg font-semibold">CareCircle</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Centered form with padding (not edge-to-edge) */}
        <div className="flex flex-1 items-center justify-center px-5 pb-8">
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
            handleSocialLogin={handleSocialLogin}
            handleForgotPassword={handleForgotPassword}
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
  handleSocialLogin: (provider: string) => void;
  handleForgotPassword: () => void;
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
  handleSocialLogin,
  handleForgotPassword,
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

      {/* Social login buttons */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("Google")}
        >
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("Apple")}
        >
          <AppleIcon className="h-5 w-5" />
          Continue with Apple
        </Button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
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
    </div>
  );
}
