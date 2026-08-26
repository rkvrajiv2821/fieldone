// src/lib/utils.ts
// Shared utility functions

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";

// ─── Tailwind class merging ───────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Digit-only phone input ────────────────────────────────────────────────────
// Strips non-digits and caps length live as the user types, for 10-digit phone fields.
export function restrictToDigits(e: { target: { value: string } }, maxLength = 10) {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, maxLength);
}

// ─── Currency formatting (₹ Indian Rupee) ────────────────────────────────────
export function formatCurrency(
  amount: number | null | undefined,
  compact = false
): string {
  if (amount == null) return "—";

  if (compact && amount >= 100000) {
    // Convert to lakhs
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(1)}L`;
  }

  if (compact && amount >= 1000) {
    const thousands = amount / 1000;
    return `₹${thousands.toFixed(1)}K`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "hh:mm a");
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isToday(d)) return `Today, ${format(d, "hh:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "hh:mm a")}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, "hh:mm a")}`;
  return formatDateTime(d);
}

export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// ─── String utilities ─────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return `${str.slice(0, length)}...`;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ─── Status helpers ───────────────────────────────────────────────────────────
export const statusConfig = {
  LEAD: {
    label: "New Customer",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  FOLLOW_UP: {
    label: "Follow-up",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  CLIENT: {
    label: "Customer",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  PENDING: {
    label: "Pending",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  COMPLETED: {
    label: "Completed",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  OVERDUE: {
    label: "Overdue",
    color: "text-red-700 bg-red-50 border-red-200",
  },
} as const;

export const priorityConfig = {
  HIGH: {
    label: "High",
    color: "text-red-700 bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
  MEDIUM: {
    label: "Medium",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  LOW: {
    label: "Low",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
} as const;

// ─── Datetime-local input helpers ─────────────────────────────────────────────
export function toDatetimeLocal(date?: Date | string | null): string {
  if (!date) return "";
  const d   = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Current datetime as min value for a datetime-local input (rounded up to next minute)
export function getMinDatetimeLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 1);
  return toDatetimeLocal(now);
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export function formatPercent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== "") {
      query.append(key, String(value));
    }
  });
  return query.toString();
}