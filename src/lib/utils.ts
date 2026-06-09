import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** פורמט סכום בשקלים (₪1,234.56) */
export function formatCurrency(amount: number, locale = "he-IL"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** פורמט צריכה בקו"ח */
export function formatKwh(value: number): string {
  return `${new Intl.NumberFormat("he-IL", {
    maximumFractionDigits: 2,
  }).format(value)} קו״ח`;
}

/** תצוגת מחיר באגורות לקו"ח — למשל 64.32 אג׳ / קו״ח */
export function formatRateAgorot(agorot: number): string {
  return `${new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(agorot)} אג׳ / קו״ח`;
}

/** תצוגת מחיר בשקלים לקו"ח */
export function formatRateShekels(shekels: number): string {
  return `${formatCurrency(shekels)} / קו״ח`;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatDate(d: Date | string, locale = "he-IL"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(d: Date | string, locale = "he-IL"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
