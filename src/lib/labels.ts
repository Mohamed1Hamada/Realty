import type { TFunction } from "i18next";
import type { Option } from "@/components/ui/select";
import type {
  ClientKind,
  ClientSource,
  ClientStatus,
  ContractStatus,
  ContractType,
  Finishing,
  LeadStage,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  Role,
  TxCategory,
  TxKind,
} from "@/types";

export const PROPERTY_TYPES: PropertyType[] = [
  "apartment",
  "duplex",
  "villa",
  "studio",
  "land",
  "shop",
  "office",
  "building",
  "warehouse",
  "farm",
];
export const PURPOSES: PropertyPurpose[] = ["sale", "rent"];
export const PROPERTY_STATUSES: PropertyStatus[] = [
  "available",
  "reserved",
  "sold",
  "rented",
  "off_market",
];
export const FINISHINGS: Finishing[] = [
  "super_lux",
  "fully_finished",
  "semi_finished",
  "core_shell",
  "needs_renovation",
];
export const CLIENT_KINDS: ClientKind[] = ["buyer", "seller", "both"];
export const CLIENT_STATUSES: ClientStatus[] = [
  "lead",
  "active",
  "closed",
  "lost",
];
export const SOURCES: ClientSource[] = [
  "facebook",
  "referral",
  "walk_in",
  "olx",
  "phone",
  "other",
];
export const STAGES: LeadStage[] = [
  "new",
  "contacted",
  "viewing",
  "negotiation",
  "won",
  "lost",
];
export const CONTRACT_TYPES: ContractType[] = ["sale", "rent"];
export const CONTRACT_STATUSES: ContractStatus[] = [
  "draft",
  "active",
  "completed",
  "cancelled",
];
export const TX_KINDS: TxKind[] = ["income", "expense"];
export const INCOME_CATEGORIES: TxCategory[] = [
  "commission",
  "rent_collection",
  "other_income",
];
export const EXPENSE_CATEGORIES: TxCategory[] = [
  "office_rent",
  "utilities",
  "salaries",
  "marketing",
  "maintenance",
  "transport",
  "other_expense",
];
export const ROLES: Role[] = ["admin", "staff"];

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "outline";

/** يترجم قيمة enum إلى نص حسب namespace */
export function label(t: TFunction, ns: string, value?: string | null) {
  if (!value) return "—";
  return t(`${ns}.${value}`) as string;
}

export function options(
  t: TFunction,
  ns: string,
  values: string[],
): Option[] {
  return values.map((v) => ({ value: v, label: t(`${ns}.${v}`) as string }));
}

const VARIANTS: Record<string, Record<string, BadgeVariant>> = {
  propertyStatus: {
    available: "success",
    reserved: "warning",
    sold: "default",
    rented: "default",
    off_market: "muted",
  },
  clientStatus: {
    lead: "warning",
    active: "success",
    closed: "default",
    lost: "danger",
  },
  stage: {
    new: "muted",
    contacted: "default",
    viewing: "warning",
    negotiation: "warning",
    won: "success",
    lost: "danger",
  },
  contractStatus: {
    draft: "muted",
    active: "warning",
    completed: "success",
    cancelled: "danger",
  },
  txKind: {
    income: "success",
    expense: "danger",
  },
  purpose: {
    sale: "default",
    rent: "warning",
  },
  role: {
    admin: "default",
    staff: "muted",
  },
};

export function badgeVariant(ns: string, value?: string | null): BadgeVariant {
  return VARIANTS[ns]?.[value ?? ""] ?? "muted";
}
