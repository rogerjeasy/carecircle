"use client";

import { motion } from "framer-motion";
import { Heart, Users, Calendar, Bell, Check, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function StyleGuidePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Heart className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Kintwadi</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-muted-foreground sm:inline">Design System</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="space-y-12 lg:space-y-16"
        >
          {/* Page Title */}
          <motion.section variants={fadeInUp} className="text-center">
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-balance">
              Design Tokens & Components
            </h1>
            <p className="mt-4 text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
              A calm, warm design system for coordinating family care with dignity and trust.
            </p>
          </motion.section>

          {/* Color Palette */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Color Palette</h2>
              <p className="mt-1 text-sm text-muted-foreground">Warm, trustworthy colors that feel like home.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              <ColorSwatch name="Background" className="bg-background border" textClassName="text-foreground" />
              <ColorSwatch name="Foreground" className="bg-foreground" textClassName="text-background" />
              <ColorSwatch name="Primary" className="bg-primary" textClassName="text-primary-foreground" />
              <ColorSwatch name="Accent" className="bg-accent" textClassName="text-accent-foreground" />
              <ColorSwatch name="Muted" className="bg-muted" textClassName="text-muted-foreground" />
              <ColorSwatch name="Card" className="bg-card border" textClassName="text-card-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <ColorSwatch name="Success" className="bg-success" textClassName="text-success-foreground" small />
              <ColorSwatch name="Warning" className="bg-warning" textClassName="text-warning-foreground" small />
              <ColorSwatch name="Destructive" className="bg-destructive" textClassName="text-destructive-foreground" small />
              <ColorSwatch name="Info" className="bg-info" textClassName="text-info-foreground" small />
            </div>
          </motion.section>

          <Separator />

          {/* Typography */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Typography</h2>
              <p className="mt-1 text-sm text-muted-foreground">Inter for UI clarity, Fraunces for warmth.</p>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden">
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Display / Fraunces</span>
                    <p className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold sm:text-3xl lg:text-4xl text-balance">
                      Caring for those who cared for us
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">UI / Inter</span>
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold tracking-tight">Heading 1 — 24px Semibold</p>
                      <p className="text-xl font-semibold tracking-tight">Heading 2 — 20px Semibold</p>
                      <p className="text-lg font-semibold tracking-tight">Heading 3 — 18px Semibold</p>
                      <p className="text-base font-medium">Heading 4 — 16px Medium</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Body Text</span>
                    <p className="text-base leading-relaxed text-pretty">
                      Body text at 16px with comfortable line-height for extended reading. 
                      Kintwadi helps families coordinate care across cities and time zones, 
                      keeping everyone informed and connected.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Small / meta text at 14px — timestamps, labels, secondary information.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          <Separator />

          {/* Buttons */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Buttons</h2>
              <p className="mt-1 text-sm text-muted-foreground">Clear actions with gentle depth on hover.</p>
            </div>

            <div className="space-y-6">
              {/* Button Variants */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Variants</span>
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="accent">Accent</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              {/* Button Sizes */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Sizes</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" aria-label="Add care task">
                    <Heart />
                  </Button>
                </div>
              </div>

              {/* Button with Icons */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">With Icons</span>
                <div className="flex flex-wrap gap-3">
                  <Button>
                    <Users />
                    Add Family Member
                  </Button>
                  <Button variant="outline">
                    <Calendar />
                    Schedule Visit
                  </Button>
                  <Button variant="accent">
                    <Bell />
                    Set Reminder
                  </Button>
                </div>
              </div>

              {/* Disabled State */}
              <div className="space-y-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Disabled</span>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>Disabled</Button>
                </div>
              </div>
            </div>
          </motion.section>

          <Separator />

          {/* Badges */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Badges</h2>
              <p className="mt-1 text-sm text-muted-foreground">Status indicators with icon + text, never color alone.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" />
                Complete
              </Badge>
              <Badge variant="warning" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Pending
              </Badge>
              <Badge variant="destructive" className="gap-1">
                <X className="h-3 w-3" />
                Overdue
              </Badge>
              <Badge variant="info" className="gap-1">
                <Info className="h-3 w-3" />
                Info
              </Badge>
              <Badge variant="accent">Accent</Badge>
            </div>
          </motion.section>

          <Separator />

          {/* Sample Cards */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Sample Cards</h2>
              <p className="mt-1 text-sm text-muted-foreground">Soft rounded cards with gentle hover lift.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                      <Check className="h-5 w-5" />
                    </div>
                    <Badge variant="success" className="gap-1">
                      <Check className="h-3 w-3" />
                      Done
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">Morning Medications</CardTitle>
                  <CardDescription>All meds given today at 8:30 AM by Maria.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">View Details</Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <Badge variant="warning" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Upcoming
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">{"Doctor's"} Appointment</CardTitle>
                  <CardDescription>Dr. Chen — Cardiology check-up tomorrow at 2 PM.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">Add to Calendar</Button>
                </CardFooter>
              </Card>

              <Card className="sm:col-span-2 lg:col-span-1">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <Badge variant="info" className="gap-1">
                      <Info className="h-3 w-3" />
                      3 members
                    </Badge>
                  </div>
                  <CardTitle className="mt-3">Care Team</CardTitle>
                  <CardDescription>Sarah, Michael, and Maria are coordinating care this week.</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="ghost" size="sm" className="w-full">Manage Team</Button>
                </CardFooter>
              </Card>
            </div>
          </motion.section>

          <Separator />

          {/* Spacing & Layout */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Spacing Scale</h2>
              <p className="mt-1 text-sm text-muted-foreground">4px base unit for consistent rhythm.</p>
            </div>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-end gap-3">
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((size) => (
                    <div key={size} className="flex flex-col items-center gap-2">
                      <div
                        className="bg-primary rounded"
                        style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
                      />
                      <span className="text-xs text-muted-foreground">{size * 4}px</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          <Separator />

          {/* Border Radius */}
          <motion.section variants={fadeInUp} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Border Radius</h2>
              <p className="mt-1 text-sm text-muted-foreground">Soft, friendly corners throughout.</p>
            </div>

            <Card>
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 bg-primary rounded-sm" />
                    <span className="text-xs text-muted-foreground">rounded-sm</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 bg-primary rounded" />
                    <span className="text-xs text-muted-foreground">rounded</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 bg-primary rounded-lg" />
                    <span className="text-xs text-muted-foreground">rounded-lg</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 bg-primary rounded-xl" />
                    <span className="text-xs text-muted-foreground">rounded-xl</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 bg-primary rounded-2xl" />
                    <span className="text-xs text-muted-foreground">rounded-2xl</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-16 w-16 bg-primary rounded-full" />
                    <span className="text-xs text-muted-foreground">rounded-full</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* Footer */}
          <motion.section variants={fadeInUp} className="pt-8 pb-4 text-center">
            <p className="text-sm text-muted-foreground">
              Kintwadi Design System • Built with warmth and accessibility in mind
            </p>
          </motion.section>
        </motion.div>
      </div>
    </main>
  );
}

function ColorSwatch({
  name,
  className,
  textClassName,
  small = false,
}: {
  name: string;
  className: string;
  textClassName: string;
  small?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-start justify-end rounded-2xl p-3 ${
        small ? "h-20" : "h-24 sm:h-28"
      } ${className}`}
    >
      <span className={`text-xs font-medium ${textClassName}`}>{name}</span>
    </div>
  );
}
