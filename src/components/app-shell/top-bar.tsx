"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

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
  "/ask": "Ask CareCircle",
  "/settings": "Settings",
};

interface TopBarProps {
  sidebarCollapsed: boolean;
  onMenuClick: () => void;
}

export function TopBar({ sidebarCollapsed, onMenuClick }: TopBarProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [unreadCount] = React.useState(3);

  const pageTitle = pageTitles[pathname] || "Dashboard";

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-8 transition-all duration-300",
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
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h1 className="truncate text-lg font-semibold sm:text-xl">{pageTitle}</h1>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search - Desktop */}
        <div className="hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ask CareCircle..."
              className="w-48 pl-9 lg:w-64"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>

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

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications, ${unreadCount} unread`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-0.5 -top-0.5 h-5 min-w-5 rounded-full px-1.5 text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* Theme toggle */}
        <ThemeToggle />
      </div>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-full border-b bg-background p-4 sm:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ask CareCircle..."
              className="w-full pl-9"
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
