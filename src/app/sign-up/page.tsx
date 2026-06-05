"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Eye, EyeOff, Heart, Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";

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
        <span className="text-xl font-semibold">CareCircle</span>
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
          &ldquo;CareCircle finally gave our family a way to stay connected around Dad&apos;s care. 
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
        <span className="text-lg font-semibold">CareCircle</span>
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
  const router = useRouter();
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
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    toast.success("Welcome to CareCircle!", {
      description: "Your account has been created successfully.",
    });
    router.push("/onboarding");
  };

  // Handle social login
  const handleSocialLogin = (provider: string) => {
    toast.info(`${provider} sign-up`, {
      description: `Redirecting to ${provider}...`,
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
              handleSocialLogin={handleSocialLogin}
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
            handleSocialLogin={handleSocialLogin}
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
            handleSocialLogin={handleSocialLogin}
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
  handleSocialLogin: (provider: string) => void;
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
  handleSocialLogin,
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
