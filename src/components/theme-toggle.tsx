"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  // No `mounted` gate: the markup is identical on the server and the first client render
  // (both render Sun + Moon, with CSS `dark:` variants choosing which is visible). next-themes
  // sets the `dark` class on <html> before hydration, so the right icon shows with no mismatch.
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 transition-transform duration-200 dark:hidden motion-reduce:transition-none" />
      <Moon className="hidden h-5 w-5 transition-transform duration-200 dark:block motion-reduce:transition-none" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
