import type { AllData } from "@/data/service";
import type { DashboardStats, PropertyType } from "@/types";

const PROPERTY_TYPES: PropertyType[] = [
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

function monthLabel(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeDashboard(data: AllData): DashboardStats {
  const { properties, clients, leads, contracts, transactions, profiles } = data;

  const availableProperties = properties.filter(
    (p) => p.status === "available",
  ).length;
  const soldRented = properties.filter(
    (p) => p.status === "sold" || p.status === "rented",
  ).length;

  const openStages = new Set(["new", "contacted", "viewing", "negotiation"]);
  const activeLeads = leads.filter((l) => openStages.has(l.stage)).length;

  const incomeTotal = transactions
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenseTotal = transactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const commissionEarned = contracts
    .filter((c) => c.status !== "cancelled")
    .reduce((s, c) => s + Number(c.commission_amount || 0), 0);

  const byType = PROPERTY_TYPES.map((key) => ({
    key,
    value: properties.filter((p) => p.type === key).length,
  }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const key = monthLabel(5 - i);
    const inMonth = (iso: string) => String(iso ?? "").slice(0, 7) === key;
    return {
      month: key,
      income: transactions
        .filter((t) => t.kind === "income" && inMonth(t.tx_date))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
      expense: transactions
        .filter((t) => t.kind === "expense" && inMonth(t.tx_date))
        .reduce((s, t) => s + Number(t.amount || 0), 0),
    };
  });

  const nameOf = (id: string | null) =>
    profiles.find((p) => p.id === id)?.full_name ?? "—";

  const commissionByAgent = new Map<string, number>();
  contracts
    .filter((c) => c.status !== "cancelled" && c.agent_id)
    .forEach((c) => {
      const key = c.agent_id as string;
      commissionByAgent.set(
        key,
        (commissionByAgent.get(key) ?? 0) + Number(c.commission_amount || 0),
      );
    });

  const topAgents = [...commissionByAgent.entries()]
    .map(([id, value]) => ({ name: nameOf(id), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const activity = [
    ...properties.map((p) => ({
      id: p.id,
      kind: "property",
      title: p.title,
      date: p.created_at,
    })),
    ...contracts.map((c) => ({
      id: c.id,
      kind: "contract",
      title: c.contract_no,
      date: c.created_at,
    })),
    ...clients.map((c) => ({
      id: c.id,
      kind: "client",
      title: c.full_name,
      date: c.created_at,
    })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);

  return {
    totalProperties: properties.length,
    availableProperties,
    soldRented,
    totalClients: clients.length,
    activeLeads,
    totalContracts: contracts.length,
    commissionEarned,
    incomeTotal,
    expenseTotal,
    netProfit: incomeTotal - expenseTotal,
    byPurpose: {
      sale: properties.filter((p) => p.purpose === "sale").length,
      rent: properties.filter((p) => p.purpose === "rent").length,
    },
    byType,
    monthly,
    topAgents,
    recentActivity: activity,
  };
}

/** تصدير جدول لملف CSV */
export function toCSV(rows: Record<string, unknown>[], headers: string[]) {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
