"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReportIncidentButton } from "@/components/incidents/report-incident-button";
import { NotificationsBell } from "@/components/notifications";
import { GlobalSearch } from "./global-search";
import { getOnCallNowAction } from "@/lib/rota/actions";
import { useAppShell, dashboardLabelByRole } from "./app-shell-context";

// Page titles mapping
const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/timeline": "Timeline",
  "/medications": "Medications",
  "/appointments": "Appointments",
  "/tasks": "Tasks",
  "/health": "Health",
  "/documents": "Documents",
  "/people": "People",
  "/digest": "Digest",
  "/ask": "Ask Kintwadi",
  "/settings": "Settings",
  "/notifications": "Notifications",
  "/incidents": "Incidents",
  "/profile": "Profile",
  "/account": "Your profile",
  "/emergency-card": "Emergency Card",
};

interface TopBarProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
}

export function TopBar({ sidebarCollapsed, onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const { role, activeCircleId } = useAppShell();
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Who's on call right now — the same rota-derived answer as the dashboard card and the rota
  // screen (one source of truth, so the chip can never contradict them). Re-resolved when the
  // active circle changes; hidden while loading or when no on-call shift covers this moment.
  const [onCallPerson, setOnCallPerson] = React.useState<{ name: string; until: string } | null>(null);
  React.useEffect(() => {
    let active = true;
    getOnCallNowAction()
      .then((p) => {
        if (active) setOnCallPerson(p);
      })
      .catch(() => {
        /* chip is decorative — fail silent, the rota screen remains authoritative */
      });
    return () => {
      active = false;
    };
  }, [activeCircleId]);

  // The home route's title follows the role-view (Today / Home / Summary / Dashboard).
  const pageTitle =
    pathname === "/dashboard" ? dashboardLabelByRole[role] : pageTitles[pathname] || "Dashboard";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-8 transition-all duration-300 print:hidden",
        // Adjust left padding based on sidebar state on desktop
        "lg:pl-8"
      )}
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title / breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <h1 className="truncate text-lg font-semibold sm:text-xl">{pageTitle}</h1>
        
        {/* On call status chip — only when someone is actually on call right now */}
        {onCallPerson && (
          <Link
            href="/rota"
            title={`On call until ${onCallPerson.until}`}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/20 transition-colors"
          >
            <Phone className="h-3 w-3" />
            <span>On call: {onCallPerson.name}</span>
          </Link>
        )}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search - Desktop */}
        <GlobalSearch className="hidden w-48 sm:block lg:w-72" />

        {/* Search - Mobile (icon button) */}
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Search"
        >
          {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </Button>

        {/* Report an incident — global quick trigger */}
        <ReportIncidentButton
          variant="ghost"
          size="icon"
          iconOnly
          label="Report an incident"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        />

        {/* Notifications */}
        <NotificationsBell />

        {/* Theme toggle */}
        <ThemeToggle />
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-full border-b bg-background p-4 sm:hidden">
          <GlobalSearch autoFocus onNavigate={() => setSearchOpen(false)} />
        </div>
      )}
    </header>
  );
}
