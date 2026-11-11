"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { PaletteButton } from "@/components/shell/command-palette";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { UserMenu, type MenuUser } from "@/components/shell/user-menu";
import { cn } from "@/lib/utils";

const publicLinks = [{ href: "/jobs", label: "Jobs" }];
const memberLinks = [
  { href: "/applications", label: "Applications" },
  { href: "/saved", label: "Saved" },
];

export function Navbar({ user }: { user: MenuUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = user ? [...publicLinks, ...memberLinks] : publicLinks;

  return (
    <header className="navbar-surface sticky top-0 z-40 border-b border-border">
      <div className="container flex h-16 items-center gap-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-heading text-base font-bold tracking-tight" onClick={() => setOpen(false)}>
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
          <PaletteButton />
          <ThemeToggle />
          {user ? (
            <div className="hidden md:block">
              <UserMenu user={user} />
            </div>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }), "hidden md:inline-flex")}>
                Sign in
              </Link>
              {/* Secondary on purpose: the page's own call to action is the one primary button in view. */}
              <Link href="/register" className={cn(buttonVariants({ variant: "secondary" }), "hidden md:inline-flex")}>
                Create account
              </Link>
            </>
          )}
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
          {user ? (
            <>
              <Link href="/profile" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-md px-3 text-base font-medium hover:bg-primary-soft">
                Profile
              </Link>
              {user.role === "admin" && (
                <Link href="/admin/applications" onClick={() => setOpen(false)} className="flex h-11 items-center rounded-md px-3 text-base font-medium hover:bg-primary-soft">
                  Admin
                </Link>
              )}
              <form action={logout} className="mt-2">
                <Button type="submit" variant="secondary" className="w-full">
                  Sign out ({user.fullName})
                </Button>
              </form>
            </>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setOpen(false)} className={buttonVariants({ variant: "secondary" })}>
                Sign in
              </Link>
              <Link href="/register" onClick={() => setOpen(false)} className={buttonVariants({ variant: "secondary" })}>
                Create account
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
