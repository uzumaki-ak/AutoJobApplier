// [F67] src/lib/utils.ts — General utility helpers
// cn() for conditional classnames, formatters, date helpers

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely — handles conflicts and conditionals */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format date to human-readable "Mar 1, 2026" */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Relative time — "3 days ago", "in 2 days" */
export function relativeTime(date: Date | string): string {
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const diff = (new Date(date).getTime() - Date.now()) / 1000;
  const absDiff = Math.abs(diff);

  if (absDiff < 60) return rtf.format(Math.round(diff), "second");
  if (absDiff < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (absDiff < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (absDiff < 2592000) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / 2592000), "month");
}

/** Status badge color mapping */
export const STATUS_COLORS = {
  SAVED: { bg: "bg-amber-500/20", text: "text-amber-300", dot: "bg-amber-300" },
  APPLIED: { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-400" },
  INTERVIEW: { bg: "bg-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
  OFFER: { bg: "bg-green-500/20", text: "text-green-400", dot: "bg-green-400" },
  REJECTED: { bg: "bg-red-500/20", text: "text-red-400", dot: "bg-red-400" },
  NO_RESPONSE: { bg: "bg-gray-500/20", text: "text-gray-400", dot: "bg-gray-400" },
} as const;

/** Status display labels */
export const STATUS_LABELS = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  NO_RESPONSE: "No Response",
} as const;

/** Truncate long strings with ellipsis */
export function truncate(str: string, length = 80): string {
  return str.length > length ? `${str.slice(0, length)}…` : str;
}

/** Score color: 0-40 red, 41-70 yellow, 71-100 green */
export function scoreColor(score: number): string {
  if (score >= 71) return "text-green-400";
  if (score >= 41) return "text-yellow-400";
  return "text-red-400";
}

/** Build Gmail compose URL (Option A — no OAuth needed) */
export function buildGmailComposeUrl(opts: {
  to: string;
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams({
    view: "cm",
    to: opts.to,
    su: opts.subject,
    body: opts.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Detect duplicates by company+role (case insensitive) */
export function normalizeDuplicateKey(company: string, role: string): string {
  return `${company.toLowerCase().trim()}:${role.toLowerCase().trim()}`;
}
