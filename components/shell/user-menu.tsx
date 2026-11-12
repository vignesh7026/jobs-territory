"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

export interface MenuUser {
  fullName: string;
  email: string;
  role: "candidate" | "admin";
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export function UserMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex h-11 w-full items-center gap-2 rounded-md px-3 text-sm hover:bg-primary-soft md:h-9 [&_svg]:size-4 [&_svg]:text-muted";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 items-center gap-2 rounded-md px-1.5 transition-colors duration-fast hover:bg-primary-soft md:h-10"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary" aria-hidden="true">
          {initials(user.fullName)}
        </span>
        <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:block">{user.fullName}</span>
        <ChevronDown className={cn("size-4 text-muted transition-transform duration-fast", open && "rotate-180")} aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-border bg-surface p-1 shadow-soft">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="my-1 border-t border-border" />
          <Link role="menuitem" href="/profile" className={item} onClick={() => setOpen(false)}>
            <UserRound /> Profile
          </Link>
          {user.role === "admin" && (
            <>
              <Link role="menuitem" href="/admin/applications" className={item} onClick={() => setOpen(false)}>
                <ShieldCheck /> Admin: applications
              </Link>
              <Link role="menuitem" href="/admin/companies" className={item} onClick={() => setOpen(false)}>
                <ShieldCheck /> Admin: companies
              </Link>
            </>
          )}
          <form action={logout}>
            <button role="menuitem" type="submit" className={item}>
              <LogOut /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
