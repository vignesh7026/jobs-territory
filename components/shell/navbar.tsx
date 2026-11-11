"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { cn } from "@/lib/utils";

const links = [
  { href: "/jobs", label: "Jobs" },
  { href: "/applications", label: "Applications" },
  { href: "/saved", label: "Saved" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar-surface sticky top-0 z-40 border-b border-border">
      <div className="container flex h-16 items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-heading text-base font-bold tracking-tight" onClick={() => setOpen(false)}>
          <span className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-primary-fg" aria-hidden="true">
            JT
          </span>
          Jobs Territory
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("rounded-md px-3 py-2 text-sm font-medium transition-colors duration-fast hover:bg-primary-soft", active ? "text-primary" : "text-muted hover:text-text")}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden md:inline-flex")}>
            Sign in
          </Link>
          <Link href="/register" className={cn(buttonVariants({ variant: "primary" }), "hidden md:inline-flex")}>
            Create account
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container flex flex-col gap-1 border-t border-border py-3 md:hidden">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="flex h-11 items-center rounded-md px-3 text-base font-medium hover:bg-primary-soft">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className={buttonVariants({ variant: "secondary" })}>
              Sign in
            </Link>
            <Link href="/register" onClick={() => setOpen(false)} className={buttonVariants({ variant: "primary" })}>
              Create account
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
