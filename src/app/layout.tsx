import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import { defaultLocale, getDir, isLocale } from "@/i18n/locales";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext", "vietnamese"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kintwadi — Coordinate Care Together",
  description: "A calm, warm app that helps families coordinate care for aging parents across cities and countries.",
  applicationName: "Kintwadi",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kintwadi",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBFAF8" },
    { media: "(prefers-color-scheme: dark)", color: "#101512" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolved per-request by src/i18n/request.ts (cookie → Accept-Language → default).
  const resolved = await getLocale();
  const locale = isLocale(resolved) ? resolved : defaultLocale;
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={getDir(locale)}
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: browser extensions (e.g. Grammarly) inject attributes into
          <body> before hydration; suppression is attribute-only and does not hide child mismatches. */}
      <body
        className="min-h-full flex flex-col font-sans bg-background text-foreground"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
          <Toaster
            position="top-center" 
            toastOptions={{
              classNames: {
                toast: "bg-card border-border text-foreground",
                title: "text-foreground",
                description: "text-muted-foreground",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
