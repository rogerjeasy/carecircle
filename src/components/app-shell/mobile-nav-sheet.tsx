"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useAppShell, ROLE_KEYS } from "./app-shell-context";

// Navigation items (same as sidebar) — text resolved from `app.nav` via `key`.
type NavItem = { href: string; key: string; icon: LucideIcon; urgent?: boolean };
const navItems: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/timeline", key: "timeline", icon: Clock },
  { href: "/medications", key: "medications", icon: Pill, urgent: true },
  { href: "/appointments", key: "appointments", icon: Calendar },
  { href: "/tasks", key: "tasks", icon: CheckSquare },
  { href: "/health", key: "health", icon: HeartPulse },
  { href: "/documents", key: "documents", icon: FileText },
  { href: "/people", key: "people", icon: Users },
  { href: "/digest", key: "digest", icon: Mail },
  { href: "/rota", key: "rota", icon: CalendarClock },
  { href: "/ask", key: "ask", icon: Sparkles },
];

// Placeholder shown in the circle switcher until the real circles load.
const PLACEHOLDER_CIRCLE = { id: "", name: "Care Circle", initials: "··", color: "bg-muted", imageUrl: null };

interface MobileNavSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
  const pathname = usePathname();
  const t = useTranslations("app");
  const { role, setRole, canAccessRoute, user, signOut, circles, activeCircleId, setActiveCircleId, setCreateCircleOpen } = useAppShell();
  const activeCircle = circles.find((c) => c.id === activeCircleId) ?? circles[0] ?? PLACEHOLDER_CIRCLE;

  // Real signed-in user (with graceful fallbacks while the profile loads).
  const currentUser = {
    name: user?.name || t("userMenu.account"),
    initials: user?.initials || "··",
    roleLabel: user ? t(`roles.${user.role}`) : "",
  };

  // Filter nav items based on current role
  const visibleNavItems = navItems.filter(item => canAccessRoute(item.href));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-[280px] flex-col p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("sidebar.navMenu")}</SheetTitle>
        </SheetHeader>

        {/* Circle Switcher */}
        <div className="shrink-0 border-b p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 h-auto py-2.5">
                <Avatar className="h-9 w-9 shrink-0">
                  {activeCircle.imageUrl && (
                    <AvatarImage src={activeCircle.imageUrl} alt={activeCircle.name} />
                  )}
                  <AvatarFallback className={activeCircle.color + " text-white text-sm font-semibold"}>
                    {activeCircle.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block truncate text-sm font-semibold">
                    {activeCircle.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t("sidebar.careCircle")}
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{t("sidebar.switchCircle")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {circles.map((circle) => (
                <DropdownMenuItem
                  key={circle.id}
                  onClick={() => setActiveCircleId(circle.id)}
                  className="gap-3"
                >
                  <Avatar className="h-7 w-7">
                    {circle.imageUrl && (
                      <AvatarImage src={circle.imageUrl} alt={circle.name} />
                    )}
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
              <DropdownMenuItem
                className="gap-3"
                onSelect={() => {
                  // Close the mobile nav sheet first so the create-circle modal isn't trapped
                  // behind it, then open the wizard.
                  onOpenChange(false);
                  setCreateCircleOpen(true);
                }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <span>{t("sidebar.createCircle")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <ScrollArea className="min-h-0 flex-1">
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
                  <span className="truncate">{t(`nav.${item.key}` as "nav.dashboard")}</span>
                  {item.urgent && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-destructive" />
                  )}
                </Link>
              );
            })}

            {/* Platform admin console — visible only to allowlisted staff (PLATFORM_ADMIN_EMAILS).
                UI visibility only; every /admin route is hard-gated by requirePlatformAdmin(). */}
            {user?.isPlatformAdmin && (
              <div className="pt-2">
                <div className="mx-1 mb-1 border-t" />
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("sidebar.platform")}
                </p>
                <Link
                  href="/admin"
                  onClick={() => onOpenChange(false)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    pathname.startsWith("/admin")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                >
                  {pathname.startsWith("/admin") && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                  )}
                  <ShieldCheck className={cn("h-5 w-5 shrink-0", pathname.startsWith("/admin") && "text-primary")} />
                  <span className="truncate">{t("sidebar.adminDashboard")}</span>
                </Link>
              </div>
            )}
          </nav>
        </ScrollArea>

        {/* Bottom Section */}
        <div className="shrink-0 border-t p-3">
          <Link
            href="/settings"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            <span>{t("nav.settings")}</span>
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
                    {currentUser.roleLabel}
                  </Badge>
                </span>
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
                    <p className="truncate text-xs text-muted-foreground">{currentUser.roleLabel}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" onClick={() => onOpenChange(false)}>
                  <User className="mr-2 h-4 w-4" />
                  {t("userMenu.yourProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={() => onOpenChange(false)}>
                  <Bell className="mr-2 h-4 w-4" />
                  {t("userMenu.notificationSettings")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Eye className="mr-2 h-4 w-4" />
                  {t("userMenu.switchRoleView")}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="w-48">
                    {ROLE_KEYS.map((roleKey) => (
                      <DropdownMenuItem
                        key={roleKey}
                        onClick={() => setRole(roleKey)}
                        className="justify-between"
                      >
                        {t(`roles.${roleKey}`)}
                        {role === roleKey && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => {
                  void signOut();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("userMenu.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SheetContent>
    </Sheet>
  );
}
