// [F36] src/components/ui/toaster.tsx — Global toast component

"use client";

import { useEffect, useState } from "react";
import { registerToastHandler } from "@/hooks/use-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    registerToastHandler((t) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
    });
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "glass rounded-xl p-4 flex items-start gap-3 shadow-lg border",
            t.variant === "destructive"
              ? "border-red-500/30 bg-red-500/10"
              : "border-[var(--color-border)]"
          )}
        >
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium", t.variant === "destructive" ? "text-red-400" : "text-[var(--color-foreground)]")}>
              {t.title}
            </p>
            {t.description && <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{t.description}</p>}
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
