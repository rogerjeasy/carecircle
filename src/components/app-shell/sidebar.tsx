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
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  LogOut,
  User,
  Bell,
  Eye,
  MoreHorizontal,
  Check,
  CalendarClock,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useAppShell, ROLE_KEYS } from "./app-shell-context";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

// Navigation items — text resolved from the `app.nav` message namespace via `key`.
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
  { href: "/profile", key: "profile", icon: User },
  { href: "/emergency-card", key: "emergencyCard", icon: ShieldAlert },
] as const;

// Placeholder shown in the circle switcher until the real circles load.
const PLACEHOLDER_CIRCLE = { id: "", name: "Care Circle", initials: "··", color: "bg-muted", imageUrl: null };

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("app");
  const { role, setRole, canAccessRoute, user, signOut, circles, activeCircleId, setActiveCircleId, setCreateCircleOpen } = useAppShell();
  const activeCircle = circles.find((c) => c.id === activeCircleId) ?? circles[0] ?? PLACEHOLDER_CIRCLE;

  // Real signed-in user (with graceful fallbacks while the profile loads).
  const currentUser = {
    name: user?.name || t("userMenu.account"),
    initials: user?.initials || "··",
    roleLabel: user ? t(`roles.${user.role}`) : "",
    avatar: user?.image ?? null,
  };

  // Filter nav items based on current role
  const visibleNavItems = navItems.filter(item => canAccessRoute(item.href));

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
                {activeCircle.imageUrl && (
                  <AvatarImage src={activeCircle.imageUrl} alt={activeCircle.name} />
                )}
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
                      {t("sidebar.careCircle")}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
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
            <DropdownMenuItem className="gap-3" onSelect={() => setCreateCircleOpen(true)}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span>{t("sidebar.createCircle")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2">
        <nav className="space-y-1 py-2">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            const itemLabel = item.href === "/dashboard" ? t(`dashboardLabels.${role}`) : t(`nav.${item.key}` as "nav.dashboard");

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
                    <span className="truncate">{itemLabel}</span>
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
                    {itemLabel}
                    {item.urgent && (
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.href}>{navLink}</React.Fragment>;
          })}

          {/* Platform admin console — visible only to allowlisted staff (PLATFORM_ADMIN_EMAILS).
              UI visibility only; every /admin route is hard-gated by requirePlatformAdmin(). */}
          {user?.isPlatformAdmin && (
            <div className="pt-2">
              <div className={cn("mb-1 border-t", collapsed ? "mx-2" : "mx-1")} />
              {!collapsed && (
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("sidebar.platform")}
                </p>
              )}
              {(() => {
                const isActive = pathname === "/admin" || pathname.startsWith("/admin/");
                const adminLink = (
                  <Link
                    href="/admin"
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      collapsed && "justify-center px-0"
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary" />
                    )}
                    <ShieldCheck className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                    {!collapsed && <span className="truncate">{t("sidebar.adminDashboard")}</span>}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>{adminLink}</TooltipTrigger>
                      <TooltipContent side="right">{t("sidebar.adminDashboard")}</TooltipContent>
                    </Tooltip>
                  );
                }
                return adminLink;
              })()}
            </div>
          )}
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
            <TooltipContent side="right">{t("nav.settings")}</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            <span>{t("nav.settings")}</span>
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
                    {currentUser.roleLabel}
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
                  <p className="truncate text-xs text-muted-foreground">{currentUser.roleLabel}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">
                <User className="mr-2 h-4 w-4" />
                {t("userMenu.yourProfile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
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
              <span>{t("sidebar.collapse")}</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}

// Mobile bottom tab bar — text resolved from `app.nav` via `key`.
const mobileNavItems: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/timeline", key: "timeline", icon: Clock },
  { href: "/medications", key: "medicationsShort", icon: Pill, urgent: true },
  { href: "/tasks", key: "tasks", icon: CheckSquare },
  { href: "#more", key: "more", icon: MoreHorizontal },
] as const;

interface MobileBottomNavProps {
  onMoreClick: () => void;
}

export function MobileBottomNav({ onMoreClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("app");
  const { canAccessRoute, role } = useAppShell();
  const [isVisible, setIsVisible] = React.useState(true);
  const [lastScrollY, setLastScrollY] = React.useState(0);

  // Filter mobile nav items based on role (except "More")
  const visibleMobileNavItems = mobileNavItems.filter(
    item => item.href === "#more" || canAccessRoute(item.href)
  );

  // Handle scroll direction detection
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      // Only trigger if scrolled more than 10px (avoid jitter)
      if (Math.abs(scrollDelta) < 10) return;

      // Hide on scroll down, show on scroll up
      if (scrollDelta > 0 && currentScrollY > 80) {
        // Scrolling down and past threshold
        setIsVisible(false);
      } else if (scrollDelta < 0) {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [lastScrollY]);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t bg-card safe-area-inset-bottom md:hidden print:hidden",
        "transition-transform duration-300 ease-in-out motion-reduce:transition-none",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex h-16 items-center justify-around px-2">
        {visibleMobileNavItems.map((item) => {
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
                <span className="text-[10px] font-medium">{t(`nav.${item.key}` as "nav.dashboard")}</span>
              </button>
            );
          }

          const itemLabel = item.href === "/dashboard" ? t(`dashboardLabels.${role}`) : t(`nav.${item.key}` as "nav.dashboard");

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
              <span className="text-[10px] font-medium">{itemLabel}</span>
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
