import type {
  Client,
  Contract,
  Lead,
  Profile,
  Property,
  Transaction,
} from "@/types";
import { appMode, supabase, TABLES } from "@/lib/supabase";
import { store } from "./store";

/* ============================================================
   طبقة بيانات موحّدة
   نفس الـ API في الوضعين:
     - demo : localStorage (بيانات تجريبية)
     - live : Supabase (جداول + Row Level Security)
   عشان تغيير الوضع مايأثرش على أي صفحة في النظام
   ============================================================ */

export type New<T> = Omit<T, "id" | "created_at"> & { id?: string };

export interface Repo<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  create(input: New<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

type Row = { id: string; created_at?: string };

function demoRepo<T extends Row>(table: keyof ReturnType<typeof store.read>): Repo<T> {
  const rows = () => store.table(table) as unknown as Row[];
  return {
    async list() {
      return [...rows()].sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
      ) as T[];
    },
    async get(id) {
      return (rows().find((r) => r.id === id) as T) ?? null;
    },
    async create(input) {
      const row = {
        ...input,
        id: input.id ?? crypto.randomUUID(),
        created_at: new Date().toISOString(),
      } as unknown as Row;
      store.insert(table, row as never);
      return row as T;
    },
    async update(id, patch) {
      store.update(table, id, {
        ...patch,
        updated_at: new Date().toISOString(),
      } as never);
      return (rows().find((r) => r.id === id) as T) ?? (patch as T);
    },
    async remove(id) {
      store.remove(table, id);
    },
  };
}

type QueryResult = { data: unknown; error: { message: string } | null };

/**
 * ملاحظة: supabase-js بيستنتج أنواع الصفوف من تعريفات Database مولّدة.
 * هنا اسم الجدول متغير، فنعامل الجدول كواجهة عامة بسيطة
 * والأنواع الحقيقية بتيجي من src/types عند الاستخدام في الصفحات.
 */
interface TableRef {
  select: (cols?: string) => {
    order: (col: string, opts: { ascending: boolean }) => Promise<QueryResult>;
    eq: (col: string, value: string) => { maybeSingle: () => Promise<QueryResult> };
  };
  insert: (payload: unknown) => {
    select: () => { single: () => Promise<QueryResult> };
  };
  update: (payload: unknown) => {
    eq: (col: string, value: string) => {
      select: () => { single: () => Promise<QueryResult> };
    };
  };
  delete: () => { eq: (col: string, value: string) => Promise<{ error: { message: string } | null }> };
}

function liveRepo<T extends Row>(table: string): Repo<T> {
  const ref = (): TableRef => {
    if (!supabase) throw new Error("Supabase client is not configured");
    return supabase.from(table) as unknown as TableRef;
  };

  return {
    async list() {
      const { data, error } = await ref().select("*").order("created_at", {
        ascending: false,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as T[];
    },
    async get(id) {
      const { data, error } = await ref().select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return (data as T) ?? null;
    },
    async create(input) {
      const payload: Record<string, unknown> = { ...input };
      delete payload.id;
      delete payload.created_at;
      const { data, error } = await ref().insert(payload).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    async update(id, patch) {
      const { data, error } = await ref().update(patch).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data as T;
    },
    async remove(id) {
      const { error } = await ref().delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
  };
}

function repo<T extends { id: string; created_at: string }>(
  table: string,
): Repo<T> {
  return appMode === "live"
    ? liveRepo<T>(table)
    : demoRepo<T>(table as keyof ReturnType<typeof store.read>);
}

export const propertiesRepo = repo<Property>(TABLES.properties);
export const clientsRepo = repo<Client>(TABLES.clients);
export const leadsRepo = repo<Lead>(TABLES.leads);
export const contractsRepo = repo<Contract>(TABLES.contracts);
export const transactionsRepo = repo<Transaction>(TABLES.transactions);
export const profilesRepo = repo<Profile>(TABLES.profiles);

export interface AllData {
  properties: Property[];
  clients: Client[];
  leads: Lead[];
  contracts: Contract[];
  transactions: Transaction[];
  profiles: Profile[];
}

export async function fetchAll(): Promise<AllData> {
  const [properties, clients, leads, contracts, transactions, profiles] =
    await Promise.all([
      propertiesRepo.list(),
      clientsRepo.list(),
      leadsRepo.list(),
      contractsRepo.list(),
      transactionsRepo.list(),
      profilesRepo.list(),
    ]);
  return { properties, clients, leads, contracts, transactions, profiles };
}

export { appMode };
