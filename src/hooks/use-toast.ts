// [F68/hooks] src/hooks/use-toast.ts — Simple toast hook
// Based on sonner pattern, works with Radix toast

"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastQueue: ((t: Omit<Toast, "id">) => void) | null = null;

export function useToast() {
  const toast = useCallback((t: Omit<Toast, "id">) => {
    if (toastQueue) toastQueue(t);
    // Fallback to console in server contexts
    else console.log(`[Toast] ${t.title}`, t.description ?? "");
  }, []);

  return { toast };
}

export function registerToastHandler(handler: (t: Omit<Toast, "id">) => void) {
  toastQueue = handler;
}
