import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/shell/navbar";
import { Toaster } from "@/components/shell/toaster";
import { ThemeScript } from "@/components/shell/theme-script";
import { getCurrentUser } from "@/lib/auth/session";

const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-manrope", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Jobs Territory", template: "%s | Jobs Territory" },
  description: "Search jobs, see how well you match, and follow every application from applied to offer.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1417" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-soft">
          Skip to content
        </a>
        <Toaster>
          <Navbar user={user ? { fullName: user.fullName, email: user.email, role: user.role } : null} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <footer className="border-t border-border py-6 text-sm text-muted">
            <div className="container flex flex-wrap items-center justify-between gap-2">
              <span>Jobs Territory</span>
              <span>Demo data only. Companies and contacts are illustrative.</span>
            </div>
          </footer>
        </Toaster>
      </body>
    </html>
  );
}
