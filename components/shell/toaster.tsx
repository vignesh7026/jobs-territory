"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/motion";

type Tone = "default" | "success" | "error";
export interface ToastInput {
  title: string;
  description?: string;
  tone?: Tone;
  /** e.g. an Undo button for destructive or irreversible actions */
  action?: { label: string; onClick: () => void };
}
interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<{ toast: (input: ToastInput) => number; dismiss: (id: number) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <Toaster>");
  return ctx;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (input: ToastInput) => {
      const id = next.current++;
      setItems((xs) => [...xs.slice(-3), { ...input, id }]);
      setTimeout(() => dismiss(id), input.action ? 8000 : 5000); // undo toasts stay longer
      return id;
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* aria-live region: screen readers announce new toasts without moving focus */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 pb-[env(safe-area-inset-bottom)]">
        <AnimatePresence initial={false}>
          {items.map((x) => (
            <motion.div
              key={x.id}
              layout={!reduce}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={t.base}
              className={cn(
                "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border bg-surface p-3 shadow-soft",
                x.tone === "error" ? "border-danger/50" : "border-border",
              )}
            >
              {x.tone === "error" ? <AlertCircle className="mt-0.5 size-5 shrink-0 text-danger-fg" /> : x.tone === "success" ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-fg" /> : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{x.title}</p>
                {x.description && <p className="mt-0.5 text-sm text-muted">{x.description}</p>}
              </div>
              {x.action && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    x.action!.onClick();
                    dismiss(x.id);
                  }}
                >
                  {x.action.label}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="-my-1 -mr-1 size-9 md:size-8" onClick={() => dismiss(x.id)} aria-label="Dismiss notification">
                <X />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
