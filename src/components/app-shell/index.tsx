"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar, MobileBottomNav } from "./sidebar";
import { TopBar } from "./top-bar";
import { MobileNavSheet } from "./mobile-nav-sheet";
import { AppShellProvider } from "./app-shell-context";

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

  return (
    <AppShellProvider>
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
        </div>
      </TooltipProvider>
    </AppShellProvider>
  );
}
