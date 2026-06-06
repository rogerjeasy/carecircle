"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// A small, self-contained, accessible Tabs implementation (WAI-ARIA tabs pattern) that mirrors
// the shadcn/Radix API surface we use elsewhere — Tabs / TabsList / TabsTrigger / TabsContent —
// without pulling in an extra Radix dependency. Supports controlled & uncontrolled usage and
// roving arrow-key navigation between triggers.

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  idBase: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error(`<${component}> must be rendered inside <Tabs>`);
  }
  return ctx;
}

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value: controlled, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [uncontrolled, setUncontrolled] = React.useState(defaultValue ?? "");
    const isControlled = controlled !== undefined;
    const value = isControlled ? controlled : uncontrolled;
    const idBase = React.useId();

    const setValue = React.useCallback(
      (next: string) => {
        if (!isControlled) setUncontrolled(next);
        onValueChange?.(next);
      },
      [isControlled, onValueChange]
    );

    return (
      <TabsContext.Provider value={{ value, setValue, idBase }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (!keys.includes(event.key)) return;

      const triggers = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])')
      );
      if (triggers.length === 0) return;
      const currentIndex = triggers.indexOf(document.activeElement as HTMLButtonElement);
      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % triggers.length;
      else if (event.key === "ArrowLeft")
        nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = triggers.length - 1;

      event.preventDefault();
      triggers[nextIndex]?.focus();
      triggers[nextIndex]?.click();
    };

    return (
      <div
        ref={ref}
        role="tablist"
        onKeyDown={handleKeyDown}
        className={cn(
          "inline-flex h-11 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = useTabsContext("TabsTrigger");
    const isActive = ctx.value === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`${ctx.idBase}-trigger-${value}`}
        aria-selected={isActive}
        aria-controls={`${ctx.idBase}-content-${value}`}
        tabIndex={isActive ? 0 : -1}
        data-state={isActive ? "active" : "inactive"}
        onClick={() => ctx.setValue(value)}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const ctx = useTabsContext("TabsContent");
    if (ctx.value !== value) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${ctx.idBase}-content-${value}`}
        aria-labelledby={`${ctx.idBase}-trigger-${value}`}
        tabIndex={0}
        className={cn(
          "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
