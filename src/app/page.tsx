import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Calendar, Shield, ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <header className="flex items-center justify-between gap-3 mb-16">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              <Heart className="h-5 w-5" />
            </span>
            <span className="truncate text-xl font-semibold font-serif">CareCircle</span>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Open App
              <LayoutDashboard className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/style-guide">
            <Button variant="ghost" size="sm">
              Design System
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </header>

        {/* Hero */}
        <section className="text-center mb-20">
          <Badge variant="accent" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" />
            Collaborative Care Platform
          </Badge>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
            Care coordination,{" "}
            <span className="text-primary">simplified</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            Bring your family and care team together in one secure place. 
            Track medications, share updates, and coordinate care with ease.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg">
                Open Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </section>

        {/* Features Grid */}
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-20">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Care Circles</CardTitle>
              <CardDescription>
                Create private groups for family members, caregivers, and healthcare providers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>Medication Tracking</CardTitle>
              <CardDescription>
                Never miss a dose with smart reminders and medication history logs.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <CardTitle>Secure & Private</CardTitle>
              <CardDescription>
                HIPAA-compliant platform with end-to-end encryption for your peace of mind.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="rounded-2xl bg-primary/5 border border-primary/10 p-8 sm:p-12 text-center">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold mb-4">
            Ready to simplify care coordination?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Join thousands of families who trust CareCircle to keep their loved ones safe and connected.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="accent">Start Free Trial</Button>
            <Link href="/style-guide">
              <Button variant="outline">
                Explore Design System
              </Button>
            </Link>
          </div>
        </section>

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>CareCircle Design System v1.0</p>
          <p className="mt-1">
            <Link href="/style-guide" className="text-primary hover:underline">
              View complete style guide
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
