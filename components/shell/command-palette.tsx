"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { filterCommands, scoreCommand, type Command } from "@/lib/palette";
import { cn } from "@/lib/utils";

export const OPEN_PALETTE_EVENT = "open-palette";

interface Personal {
  savedSearches: { id: string; name: string; href: string }[];
  applications: { id: string; title: string; company: string }[];
}
type Item = Command & { run?: () => void };

function toggleTheme() {
  const next = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", next);
  try {
    localStorage.setItem("theme", next ? "dark" : "light");
  } catch {
    /* private mode */
  }
}

/** Ctrl+K (or Cmd+K): jump anywhere, search jobs, open an application or a saved search. Fully keyboard-driven. */
export function CommandPalette({ user }: { user: { role: "candidate" | "admin" } | null }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [personal, setPersonal] = useState<Personal>({ savedSearches: [], applications: [] });
  const [, startLogout] = useTransition();

  const close = useCallback(() => setOpen(false), []);

  // Open with Ctrl/Cmd+K or from the navbar button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery("");
      setActive(0);
      if (user) {
        fetch("/api/palette")
          .then((r) => (r.ok ? (r.json() as Promise<Personal>) : null))
          .then((p) => p && setPersonal(p))
          .catch(() => {
            /* personal items are a bonus; the palette works without them */
          });
      }
    }
    if (!open && d.open) d.close();
  }, [open, user]);

  const items = useMemo<Item[]>(() => {
    const go = (label: string, href: string, keywords?: string): Item => ({ id: `go:${href}`, label, href, keywords, group: "Go to" });
    const base: Item[] = [go("Jobs", "/jobs", "search browse listings"), go("Compare jobs", "/compare", "side by side")];
    if (user) {
      base.push(
        go("Applications", "/applications", "status trail history"),
        { id: "go:board", label: "Application board", href: "/applications?view=board", keywords: "kanban columns", group: "Go to" },
        go("Saved jobs and searches", "/saved", "bookmarks"),
        go("Career path and learning plan", "/career", "timeline roadmap skills plan growth"),
        go("Practice interviews", "/practice", "mock interview questions timer"),
        go("Profile", "/profile", "resume skills account experience"),
      );
      if (user.role === "admin") base.push(go("Admin queue", "/admin/applications", "review change status"));
    } else {
      base.push(go("Sign in", "/login"), go("Create account", "/register", "register sign up"));
    }
    base.push({ id: "act:theme", label: "Toggle dark mode", keywords: "theme light appearance", group: "Actions", run: toggleTheme });
    if (user) base.push({ id: "act:logout", label: "Sign out", keywords: "log out", group: "Actions", run: () => startLogout(() => logout()) });

    const q = query.trim();
    const dynamic: Item[] = [
      ...(q ? [{ id: "search", label: `Search jobs for “${q}”`, hint: "Enter", href: `/jobs?q=${encodeURIComponent(q)}`, group: "Search" as const, keywords: q }] : []),
      ...personal.savedSearches.map((s) => ({ id: `ss:${s.id}`, label: s.name, href: s.href, group: "Saved searches" as const, hint: "Run" })),
      ...personal.applications.map((a) => ({ id: `app:${a.id}`, label: `${a.title}`, keywords: a.company, href: `/applications/${a.id}`, group: "Applications" as const, hint: a.company })),
    ];
    const matched = filterCommands([...base, ...dynamic], q);
    if (!q) return matched;
    // A good match for a command or item wins (typing "prof" and pressing Enter opens Profile). Only when nothing matches
    // well does "Search jobs for ..." take the top spot.
    const search = matched.filter((m) => m.id === "search");
    const rest = matched.filter((m) => m.id !== "search");
    const strong = rest.some((m) => scoreCommand(q, m) >= 40);
    return strong ? [...rest, ...search] : [...search, ...rest];
  }, [query, personal, user, startLogout]);

  useEffect(() => {
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function run(item: Item | undefined) {
    if (!item) return;
    close();
    if (item.run) item.run();
    else if (item.href) router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (items.length ? (a + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (items.length ? (a - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[active]);
    } else if (e.key === "Home") {
      setActive(0);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === dialog.current && close()}
      aria-label="Command palette"
      className="m-0 mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-xl rounded-lg border border-border bg-surface p-0 text-text shadow-soft backdrop:bg-text/40"
    >
      <div className="flex items-center gap-2 border-b border-border px-3">
        <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={items[active] ? `palette-opt-${active}` : undefined}
          aria-label="Type a command or search jobs"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0); // a new query starts at the best match
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a command or search jobs"
          className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted"
        />
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted sm:block">Esc</kbd>
      </div>

      <ul id="palette-list" role="listbox" ref={list} aria-label="Results" className="max-h-[50vh] overflow-y-auto p-1.5">
        {items.length === 0 && (
          <li role="presentation" className="px-3 py-6 text-center text-sm text-muted">
            Nothing matches &ldquo;{query}&rdquo;. Press Enter to search jobs for it.
          </li>
        )}
        {items.map((item, i) => {
          // a group heading appears where the group changes
          const heading = i === 0 || items[i - 1].group !== item.group ? item.group : null;
          return (
            <li key={item.id} role="presentation">
              {heading && (
                <p role="presentation" className="px-2 pb-1 pt-2 text-xs font-medium text-muted">
                  {heading}
                </p>
              )}
              <div
                id={`palette-opt-${i}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={() => run(item)}
                className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm md:min-h-9", i === active ? "bg-primary-soft" : "")}
              >
                <span className="truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-xs text-muted">{item.hint}</span>}
                {i === active && !item.hint && <CornerDownLeft className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">Up and down to move, Enter to open, Esc to close.</p>
    </dialog>
  );
}

/** Navbar trigger. */
export function PaletteButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
      aria-label="Open command palette (Ctrl+K)"
      className="flex h-11 items-center gap-2 rounded-md px-3 text-sm text-muted transition-colors duration-fast hover:bg-primary-soft hover:text-text md:h-9 md:border md:border-border md:bg-surface"
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="hidden lg:inline">Search or jump to</span>
      <kbd className="hidden rounded border border-border px-1.5 text-xs lg:inline">Ctrl K</kbd>
    </button>
  );
}
