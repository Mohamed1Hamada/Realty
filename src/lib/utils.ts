import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** تنسيق مبلغ بالجنيه المصري: 1250000 -> 1,250,000 */
export function formatMoney(value: number | null | undefined, currency = "EGP") {
  const n = Number(value ?? 0);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(n);
  return currency ? `${formatted} ${currency === "EGP" ? "ج.م" : currency}` : formatted;
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US").format(Number(value ?? 0));
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function initials(name?: string | null) {
  if (!name) return "؟";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

/**
 * بيستخرج "اسم المستخدم" المعروض من البريد الداخلي.
 * البريد داخلي بس (username@realty-office.app) ومش بيظهر للمستخدم —
 * اليوزر نيم هو الجزء اللي قبل @.
 */
export function usernameOf(email?: string | null) {
  if (!email) return "";
  return email.split("@")[0];
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function uid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
