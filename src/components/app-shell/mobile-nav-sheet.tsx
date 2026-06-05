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
  Plus,
  LogOut,
  User,
  Bell,
  Eye,
  ChevronDown,
  Check,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useAppShell, roleLabels, UserRole } from "./app-shell-context";

// Navigation items (same as sidebar)
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
  { href: "/rota", label: "Rota", icon: CalendarClock },
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
};

interface MobileNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname();
  const [activeCircle, setActiveCircle] = React.useState(circles[0]);
  const { role, setRole, canAccessRoute } = useAppShell();

  // Filter nav items based on current role
  const visibleNavItems = navItems.filter(item => canAccessRoute(item.href));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>

        {/* Circle Switcher */}
        <div className="border-b p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2.5">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={activeCircle.color + " text-white text-sm font-semibold"}>
                    {activeCircle.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold">
                    {activeCircle.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    Care Circle
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
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
        <ScrollArea className="flex-1 h-[calc(100vh-180px)]">
          <nav className="space-y-1 p-3">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                  )}
                  <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  <span className="truncate">{item.label}</span>
                  {item.urgent && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="border-t p-3">
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>

          {/* User Info */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="mt-1 w-full justify-start gap-3 h-auto py-2.5">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-secondary text-sm font-semibold">
                    {currentUser.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold">
                    {currentUser.name}
                  </span>
                  <Badge variant="secondary" className="mt-0.5 text-[10px] px-1.5 py-0">
                    {currentUser.role}
                  </Badge>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
<DropdownMenuItem>
              <Bell className="mr-2 h-4 w-4" />
              Notification settings
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Eye className="mr-2 h-4 w-4" />
                Switch role view
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48">
                  {(Object.keys(roleLabels) as UserRole[]).map((roleKey) => (
                    <DropdownMenuItem
                      key={roleKey}
                      onClick={() => setRole(roleKey)}
                      className="justify-between"
                    >
                      {roleLabels[roleKey]}
                      {role === roleKey && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SheetContent>
    </Sheet>
  );
}
