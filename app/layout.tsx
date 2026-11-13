import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shell/navbar";
import { Toaster } from "@/components/shell/toaster";
import { ThemeScript } from "@/components/shell/theme-script";
import { CommandPalette } from "@/components/shell/command-palette";
import { PageTransition } from "@/components/shell/page-transition";
import { CompareProvider } from "@/components/compare/compare-provider";
import { CompareTray } from "@/components/compare/compare-tray";
import { getCurrentUser } from "@/lib/auth/session";

// Newsreader (a text serif) for headings and IBM Plex Sans for the interface: a calmer, more editorial pairing than the
// usual geometric sans, and Plex has clear numerals for salaries and scores.
const heading = Newsreader({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-heading", display: "swap" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Jobs Territory", template: "%s | Jobs Territory" },
  description: "Search jobs, see how well you match, and follow every application from applied to offer.",
};

export const viewport: Viewport = {
  themeColor: "#F7F6F2",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-soft">
          Skip to content
        </a>
        <Toaster>
          <CompareProvider>
          <Navbar user={user ? { fullName: user.fullName, email: user.email, role: user.role } : null} />
          <main id="main" className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
          <footer className="border-t border-border py-6 text-sm text-muted">
            <div className="container flex flex-wrap items-center justify-between gap-2">
              <span>Jobs Territory</span>
              <span>Demo data only. Companies and contacts are illustrative.</span>
            </div>
          </footer>
          <CompareTray />
          <CommandPalette user={user ? { role: user.role } : null} />
          </CompareProvider>
        </Toaster>
      </body>
    </html>
  );
}
