"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clock,
  Pill,
  Calendar,
  CheckSquare,
  HeartPulse,
  FileText,
  Users,
  Mail,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  LogOut,
  User,
  Bell,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Navigation items
const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/medications", label: "Medications", icon: Pill, urgent: true },
  { href: "/appointments", label: "Appointments", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/people", label: "People", icon: Users },
  { href: "/digest", label: "Digest", icon: Mail },
  { href: "/ask", label: "Ask CareCircle", icon: Sparkles },
];

// Sample circles
const circles = [
  { id: "1", name: "Antonio's Care", initials: "AC", color: "bg-primary" },
  { id: "2", name: "Mom – Rosa", initials: "MR", color: "bg-accent" },
];

// Current user
const currentUser = {
  name: "Maria Santos",
  initials: "MS",
  role: "Coordinator",
  avatar: null,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [activeCircle, setActiveCircle] = React.useState(circles[0]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-card transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[264px]"
      )}
    >
      {/* Circle Switcher */}
      <div className={cn("p-3", collapsed && "px-2")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-auto py-2.5",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className={activeCircle.color + " text-white text-sm font-semibold"}>
                  {activeCircle.initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate text-sm font-semibold">
                      {activeCircle.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Care Circle
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch Circle</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {circles.map((circle) => (
              <DropdownMenuItem
                key={circle.id}
                onClick={() => setActiveCircle(circle)}
                className="gap-3"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className={circle.color + " text-white text-xs font-semibold"}>
                    {circle.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{circle.name}</span>
                {circle.id === activeCircle.id && (
                  <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span>Create new circle</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            const navLink = (
              <Link
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  collapsed && "justify-center px-0"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                )}
                <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.urgent && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </>
                )}
                {collapsed && item.urgent && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-2">
                    {item.label}
                    {item.urgent && (
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.href}>{navLink}</React.Fragment>;
          })}
        </nav>
      </ScrollArea>

      {/* Bottom Section */}
      <div className={cn("border-t p-2", collapsed && "px-2")}>
        {/* Settings */}
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="flex items-center justify-center rounded-xl px-3 py-2.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "mt-1 w-full justify-start gap-3 h-auto py-2.5",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0">
                {currentUser.avatar ? (
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                ) : (
                  <AvatarFallback className="bg-secondary text-sm font-semibold">
                    {currentUser.initials}
                  </AvatarFallback>
                )}
              </Avatar>
              {!collapsed && (
                <span className="flex-1 min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold">
                    {currentUser.name}
                  </span>
                  <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0">
                    {currentUser.role}
                  </Badge>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-secondary text-xs font-semibold">
                    {currentUser.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{currentUser.role}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              Notification settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              Switch role view
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "mt-2 w-full",
            collapsed && "px-0"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

// Mobile bottom tab bar
const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/medications", label: "Meds", icon: Pill, urgent: true },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "#more", label: "More", icon: MoreHorizontal },
];

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card safe-area-inset-bottom md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {mobileNavItems.map((item) => {
          const isMore = item.href === "#more";
          const isActive = !isMore && (pathname === item.href || pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          if (isMore) {
            return (
              <button
                key={item.href}
                onClick={onMoreClick}
                className="flex flex-1 flex-col items-center gap-1 py-2 text-muted-foreground"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.urgent && (
                <span className="absolute right-1/4 top-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
