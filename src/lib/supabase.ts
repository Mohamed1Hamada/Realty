import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseCredentials =
  url.startsWith("http") && anonKey.length > 20;

/**
 * وضع التشغيل:
 *  - live : لما تكون المفاتيح موجودة في .env و VITE_APP_ENV=live
 *  - demo : بيانات محلية في المتصفح (مناسبة للعرض والتجربة قبل التسليم)
 */
export const appMode: "demo" | "live" =
  hasSupabaseCredentials && import.meta.env.VITE_APP_ENV === "live"
    ? "live"
    : "demo";

export const supabase: SupabaseClient | null = hasSupabaseCredentials
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

export const TABLES = {
  profiles: "profiles",
  properties: "properties",
  clients: "clients",
  leads: "leads",
  contracts: "contracts",
  transactions: "transactions",
} as const;
