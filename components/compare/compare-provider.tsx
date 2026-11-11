"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { MAX_COMPARE } from "@/lib/compare";

export interface CompareItem {
  id: string;
  title: string;
  company: string;
}

// The selection lives in sessionStorage so it survives page changes and reloads but not a new browser session.
const KEY = "compare-jobs";
const EVENT = "compare-change";
const EMPTY: CompareItem[] = [];
let cache: { raw: string | null; items: CompareItem[] } = { raw: null, items: EMPTY };

function read(): CompareItem[] {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.items; // stable reference: required by useSyncExternalStore
  let items = EMPTY;
  try {
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (Array.isArray(parsed)) items = parsed.filter((x): x is CompareItem => typeof x?.id === "string" && typeof x?.title === "string" && typeof x?.company === "string").slice(0, MAX_COMPARE);
  } catch {
    /* corrupt value: start over */
  }
  cache = { raw, items };
  return items;
}
function write(items: CompareItem[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* private mode: selection just will not persist */
  }
  window.dispatchEvent(new Event(EVENT));
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

interface Ctx {
  items: CompareItem[];
  has: (id: string) => boolean;
  /** returns false when the job could not be added because three are already selected */
  toggle: (item: CompareItem) => boolean;
  remove: (id: string) => void;
  clear: () => void;
}
const CompareContext = createContext<Ctx | null>(null);

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside <CompareProvider>");
  return ctx;
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((item: CompareItem) => {
    const current = read();
    if (current.some((i) => i.id === item.id)) {
      write(current.filter((i) => i.id !== item.id));
      return true;
    }
    if (current.length >= MAX_COMPARE) return false;
    write([...current, item]);
    return true;
  }, []);
  const remove = useCallback((id: string) => write(read().filter((i) => i.id !== id)), []);
  const clear = useCallback(() => write([]), []);

  const value = useMemo<Ctx>(() => ({ items, has: (id) => items.some((i) => i.id === id), toggle, remove, clear }), [items, toggle, remove, clear]);
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}
