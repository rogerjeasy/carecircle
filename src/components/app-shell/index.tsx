"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileBottomNav } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileNavSheet } from "./mobile-nav-sheet";
import { ServiceStatusBanner } from "./service-status-banner";
import { useAppShell } from "./app-shell-context";
import { CreateCircleDialog } from "@/components/onboarding";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Track if running on tablet (used only as the *default* collapsed state)
  const [isTablet, setIsTablet] = React.useState(false);
  // null = follow the responsive default; boolean = the user's explicit choice
  const [userCollapsed, setUserCollapsed] = React.useState<boolean | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Check viewport width and detect tablet
  React.useEffect(() => {
    const checkWidth = () => {
      const width = window.innerWidth;
      // Tablet: 768-1023px (md to lg breakpoint)
      setIsTablet(width >= 768 && width < 1024);
    };

    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Load user preference from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setUserCollapsed(stored === "true");
    }
  }, []);

  // The user's explicit choice always wins; otherwise default to collapsed on
  // tablet and expanded on desktop. This lets tablet/iPad users expand the
  // sidebar via the toggle instead of being stuck on icons-only.
  const sidebarCollapsed = userCollapsed ?? isTablet;

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setUserCollapsed(newValue);
    localStorage.setItem("sidebar-collapsed", String(newValue));
  };

  // The AppShellProvider is mounted ONCE in src/app/(app)/layout.tsx (server-seeded with the
  // signed-in user), so every page under the group — including ones that don't render AppShell,
  // like /admin — shares the same role/circle context without a client-side identity fetch.
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Desktop/Tablet Sidebar - hidden on mobile (and when printing) */}
        <div className="hidden md:block print:hidden">
          <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
        </div>

        {/* Mobile Nav Sheet */}
        <MobileNavSheet open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

        {/* Main content area */}
        <div
          className={cn(
            "flex min-h-screen flex-col transition-all duration-300",
            // Match the sidebar width at every breakpoint >= md so content
            // never overlaps the sidebar (whether collapsed or expanded).
            sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[264px]",
            // Full-bleed when printing (chrome is hidden)
            "print:ml-0"
          )}
        >
          {/* Top bar */}
          <TopBar
            sidebarCollapsed={sidebarCollapsed}
            onMenuClick={() => setMobileNavOpen(true)}
          />

          {/* Platform outage notice — only renders when a service is actually down */}
          <ServiceStatusBanner />

          {/* Page content */}
          <main className="flex-1 pb-20 md:pb-0 print:pb-0">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">
              <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300">
                {children}
              </div>
            </div>
          </main>
        </div>

        {/* Mobile bottom nav - only on mobile */}
        <MobileBottomNav onMoreClick={() => setMobileNavOpen(true)} />

        {/* "Create a new care circle" modal — reuses the onboarding wizard in-place so the
            user never leaves the dashboard. Mounted once, opened from either nav switcher. */}
        <CreateCircleHost />
      </div>
    </TooltipProvider>
  );
}

/**
 * Bridges the shared "Create new circle" dialog to the app-shell context. On success it refreshes
 * the circle list and pivots the active circle to the brand-new one, then lets the dialog close —
 * all without a navigation, so the dashboard simply re-renders for the new circle.
 */
function CreateCircleHost() {
  const { createCircleOpen, setCreateCircleOpen, refreshCircles, setActiveCircleId } = useAppShell();
  return (
    <CreateCircleDialog
      open={createCircleOpen}
      onOpenChange={setCreateCircleOpen}
      onCreated={async ({ circleId }) => {
        // Pull the new circle into the switcher, then make it active (sets the cookie, re-resolves
        // the user's role for it, and refreshes server components for the dashboard).
        await refreshCircles();
        await setActiveCircleId(circleId);
      }}
    />
  );
}
