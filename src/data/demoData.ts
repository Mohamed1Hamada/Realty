import type {
  Client,
  Contract,
  ContractStatus,
  ContractType,
  Lead,
  LeadStage,
  Profile,
  Property,
  PropertyStatus,
  PropertyType,
  Transaction,
  TxCategory,
} from "@/types";

/* ============================================================
   بيانات تجريبية واقعية — تُستخدم في وضع العرض (demo)
   بعد ربط Supabase استخدم supabase/seed.sql لنفس البيانات
   ============================================================ */

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function monthKey(offset: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const demoProfiles: Profile[] = [
  {
    id: "u-admin",
    email: "admin@realty.app",
    full_name: "أحمد عبد الرحمن",
    phone: "01000000001",
    role: "admin",
    commission_rate: 0,
    is_active: true,
    created_at: daysAgo(400),
  },
  {
    id: "u-1",
    email: "sara@realty.app",
    full_name: "سارة محمود",
    phone: "01000000002",
    role: "staff",
    commission_rate: 1,
    is_active: true,
    created_at: daysAgo(320),
  },
  {
    id: "u-2",
    email: "khaled@realty.app",
    full_name: "خالد إبراهيم",
    phone: "01000000003",
    role: "staff",
    commission_rate: 1.25,
    is_active: true,
    created_at: daysAgo(240),
  },
  {
    id: "u-3",
    email: "mona@realty.app",
    full_name: "منى السيد",
    phone: "01000000004",
    role: "staff",
    commission_rate: 1,
    is_active: true,
    created_at: daysAgo(120),
  },
];

const districts: { gov: string; district: string }[] = [
  { gov: "القاهرة", district: "المقطم" },
  { gov: "القاهرة", district: "مدينة نصر" },
  { gov: "القاهرة", district: "التجمع الخامس" },
  { gov: "القاهرة", district: "المعادي" },
  { gov: "القاهرة", district: "مصر الجديدة" },
  { gov: "القاهرة", district: "الزيتون" },
  { gov: "الجيزة", district: "الشيخ زايد" },
  { gov: "الجيزة", district: "6 أكتوبر" },
  { gov: "الجيزة", district: "الهرم" },
  { gov: "الجيزة", district: "الدقي" },
  { gov: "الإسكندرية", district: "سموحة" },
  { gov: "الإسكندرية", district: "سيدي جابر" },
  { gov: "بني سويف", district: "بني سويف الجديدة" },
  { gov: "بني سويف", district: "شرق النيل" },
];

const typePool: PropertyType[] = [
  "apartment",
  "apartment",
  "apartment",
  "apartment",
  "duplex",
  "villa",
  "studio",
  "land",
  "shop",
  "office",
  "building",
  "warehouse",
];

const finishingPool = [
  "super_lux",
  "fully_finished",
  "semi_finished",
  "core_shell",
  "needs_renovation",
] as const;

const ownerNames = [
  "م. حسن فؤاد",
  "أ. منى الشربيني",
  "د. طارق نور",
  "الحاج سيد عبد العال",
  "أ. رانيا كمال",
  "م. عمرو زكي",
  "أ. هبة الله مصطفى",
  "الكابتن وليد سامي",
  "أ. نرمين عادل",
  "م. يوسف الشناوي",
];

function priceFor(type: PropertyType, area: number, purpose: string, lux: number) {
  const perMeterSale: Record<PropertyType, number> = {
    apartment: 16000,
    duplex: 20000,
    villa: 28000,
    studio: 18000,
    land: 6500,
    shop: 45000,
    office: 22000,
    building: 14000,
    warehouse: 5000,
    farm: 1200,
  };
  const factor = purpose === "rent" ? 0.0055 : 1;
  const base = area * perMeterSale[type] * (0.8 + lux * 0.1) * factor;
  return Math.round(base / 1000) * 1000;
}

export const demoProperties: Property[] = Array.from({ length: 25 }, (_, i) => {
  const type = typePool[i % typePool.length];
  const loc = districts[i % districts.length];
  const purpose = i % 3 === 0 ? "rent" : "sale";
  const area =
    type === "land"
      ? 200 + i * 45
      : type === "villa"
        ? 280 + i * 15
        : type === "warehouse"
          ? 400 + i * 30
          : 70 + ((i * 17) % 180);
  const finishing = finishingPool[i % finishingPool.length];
  const lux = finishingPool.indexOf(finishing);
  const status: PropertyStatus =
    i % 7 === 0
      ? "sold"
      : i % 9 === 0
        ? "rented"
        : i % 11 === 0
          ? "reserved"
          : i % 13 === 0
            ? "off_market"
            : "available";
  const bedrooms =
    type === "land" || type === "warehouse"
      ? null
      : type === "villa"
        ? 4 + (i % 2)
        : 1 + (i % 4);
  const agent = demoProfiles[1 + (i % 3)];
  return {
    id: `p-${i + 1}`,
    ref_code: `PR-${1001 + i}`,
    title:
      type === "land"
        ? `أرض ${area} م في ${loc.district}`
        : type === "villa"
          ? `فيلا ${area} م ${loc.district}`
          : `${
              {
                apartment: "شقة",
                duplex: "دوبلكس",
                studio: "ستوديو",
                shop: "محل",
                office: "مكتب إداري",
                building: "عمارة",
                warehouse: "مخزن",
                farm: "مزرعة",
              }[type as "apartment"]
            } ${area} م — ${loc.district}`,
    description: `وحدة بمساحة ${area} متر في ${loc.district}، ${loc.gov}. قريبة من الخدمات والمواصلات، تصلح ${
      purpose === "sale" ? "للسكن أو الاستثمار" : "للسكن العائلي"
    }.`,
    purpose,
    type,
    status,
    area_sqm: area,
    bedrooms,
    bathrooms: bedrooms ? Math.max(1, Math.floor(bedrooms / 2)) : null,
    floor_no: type === "land" || type === "villa" ? null : 1 + (i % 12),
    total_floors: type === "land" || type === "villa" ? null : 6 + (i % 8),
    finishing: type === "land" ? null : finishing,
    price: priceFor(type, area, purpose, lux),
    rent_period: purpose === "rent" ? "monthly" : null,
    governorate: loc.gov,
    district: loc.district,
    address: `${loc.district}، شارع ${10 + i}، ${loc.gov}`,
    images: [],
    owner_name: ownerNames[i % ownerNames.length],
    owner_phone: `011${String(10000000 + i * 1234).slice(0, 8)}`,
    agent_id: agent.id,
    featured: i % 5 === 0,
    notes: i % 4 === 0 ? "السعر قابل للتفاوض البسيط." : null,
    created_by: agent.id,
    created_at: daysAgo(2 + i * 5),
    updated_at: daysAgo(i * 2),
  };
});

type ClientSeed = Pick<
  Client,
  "full_name" | "phone" | "kind" | "status" | "source" | "budget"
>;

const clientSeed: ClientSeed[] = [
  { full_name: "محمد عبد الله", phone: "01012345601", kind: "buyer", status: "active", source: "facebook", budget: 3500000 },
  { full_name: "هدى الشريف", phone: "01012345602", kind: "buyer", status: "lead", source: "olx", budget: 2200000 },
  { full_name: "شركة النيل للمقاولات", phone: "01012345603", kind: "seller", status: "active", source: "referral", budget: null },
  { full_name: "أحمد سامي", phone: "01012345604", kind: "buyer", status: "closed", source: "walk_in", budget: 5000000 },
  { full_name: "مروة عادل", phone: "01012345605", kind: "buyer", status: "active", source: "facebook", budget: 1800000 },
  { full_name: "د. خالد منير", phone: "01012345606", kind: "both", status: "active", source: "referral", budget: 8000000 },
  { full_name: "سلمى فتحي", phone: "01012345607", kind: "buyer", status: "lost", source: "phone", budget: 1200000 },
  { full_name: "م. عمر حجازي", phone: "01012345608", kind: "seller", status: "active", source: "walk_in", budget: null },
  { full_name: "نيفين كامل", phone: "01012345609", kind: "buyer", status: "lead", source: "olx", budget: 2750000 },
  { full_name: "مصطفى عبد الغني", phone: "01012345610", kind: "buyer", status: "active", source: "facebook", budget: 4200000 },
  { full_name: "ريم الشاذلي", phone: "01012345611", kind: "buyer", status: "closed", source: "referral", budget: 3100000 },
  { full_name: "أ. عادل نصيف", phone: "01012345612", kind: "seller", status: "active", source: "phone", budget: null },
  { full_name: "شركة الأمل للتجارة", phone: "01012345613", kind: "buyer", status: "active", source: "referral", budget: 12000000 },
  { full_name: "ياسمين حسن", phone: "01012345614", kind: "buyer", status: "lead", source: "facebook", budget: 950000 },
];

export const demoClients: Client[] = clientSeed.map((c, i) => ({
  id: `c-${i + 1}`,
  email: null,
  notes: null,
  assigned_to: demoProfiles[1 + (i % 3)].id,
  created_at: daysAgo(5 + i * 9),
  ...c,
}));

const stages: LeadStage[] = [
  "new",
  "contacted",
  "viewing",
  "negotiation",
  "won",
  "lost",
];

export const demoLeads: Lead[] = Array.from({ length: 20 }, (_, i) => ({
  id: `l-${i + 1}`,
  client_id: `c-${(i % demoClients.length) + 1}`,
  property_id: `p-${(i % demoProperties.length) + 1}`,
  stage: stages[i % stages.length],
  next_followup_at:
    i % 5 === 0 ? daysFromNow(-2) : i % 3 === 0 ? daysFromNow(0) : daysFromNow(i % 7 + 1),
  notes:
    i % 4 === 0
      ? "العميل طلب معاينة تانية نهاية الأسبوع."
      : i % 4 === 1
        ? "مهتم بالسعر، محتاج تفاوض مع المالك."
        : null,
  owner_id: demoProfiles[1 + (i % 3)].id,
  created_at: daysAgo(1 + i * 3),
  updated_at: daysAgo(i),
}));

type ContractSeed = {
  type: ContractType;
  pIdx: number;
  cIdx: number;
  amount: number;
  rate: number;
  paid: number;
  status: ContractStatus;
  agent: string;
  months: number;
};

const contractSeed: ContractSeed[] = [
  { type: "sale", pIdx: 0, cIdx: 3, amount: 4200000, rate: 1.25, paid: 100, status: "completed", agent: "u-1", months: 5 },
  { type: "sale", pIdx: 3, cIdx: 0, amount: 3600000, rate: 1, paid: 100, status: "completed", agent: "u-2", months: 4 },
  { type: "rent", pIdx: 6, cIdx: 4, amount: 240000, rate: 1, paid: 100, status: "active", agent: "u-3", months: 3 },
  { type: "sale", pIdx: 8, cIdx: 5, amount: 9500000, rate: 1.5, paid: 50, status: "active", agent: "u-1", months: 2 },
  { type: "sale", pIdx: 10, cIdx: 9, amount: 5250000, rate: 1, paid: 0, status: "draft", agent: "u-2", months: 1 },
  { type: "rent", pIdx: 12, cIdx: 12, amount: 360000, rate: 1, paid: 100, status: "completed", agent: "u-3", months: 4 },
  { type: "sale", pIdx: 14, cIdx: 10, amount: 2850000, rate: 1.25, paid: 100, status: "completed", agent: "u-1", months: 2 },
  { type: "rent", pIdx: 16, cIdx: 6, amount: 180000, rate: 1, paid: 60, status: "cancelled", agent: "u-2", months: 1 },
  { type: "sale", pIdx: 20, cIdx: 5, amount: 7400000, rate: 1, paid: 25, status: "active", agent: "u-3", months: 0 },
];

export const demoContracts: Contract[] = contractSeed.map((c, i) => {
  const commission = Math.round((c.amount * c.rate) / 100);
  return {
    id: `ct-${i + 1}`,
    contract_no: `CNT-${2025000 + i + 1}`,
    type: c.type,
    property_id: `p-${c.pIdx + 1}`,
    client_id: `c-${c.cIdx + 1}`,
    total_amount: c.amount,
    commission_rate: c.rate,
    commission_amount: commission,
    paid_amount: Math.round((commission * c.paid) / 100),
    status: c.status as Contract["status"],
    sign_date: new Date(new Date().setMonth(new Date().getMonth() - c.months))
      .toISOString()
      .slice(0, 10),
    start_date: new Date(new Date().setMonth(new Date().getMonth() - c.months))
      .toISOString()
      .slice(0, 10),
    end_date:
      c.type === "rent"
        ? new Date(new Date().setMonth(new Date().getMonth() + 12 - c.months))
            .toISOString()
            .slice(0, 10)
        : null,
    agent_id: c.agent,
    notes: null,
    created_at: daysAgo(c.months * 30 + 2),
  };
});

export const demoTransactions: Transaction[] = (() => {
  const list: Transaction[] = [];
  // إيرادات من العقود
  demoContracts.forEach((c, i) => {
    if (c.paid_amount > 0 && c.status !== "cancelled") {
      list.push({
        id: `t-in-${i + 1}`,
        kind: "income",
        category: c.type === "rent" ? "rent_collection" : "commission",
        amount: c.paid_amount,
        description: `عمولة عقد ${c.contract_no}`,
        tx_date: c.sign_date,
        contract_id: c.id,
        created_by: "u-admin",
        created_at: c.created_at,
      });
    }
  });
  // مصروفات شهرية ثابتة
  const expenses: { cat: TxCategory; amount: number; desc: string }[] = [
    { cat: "office_rent", amount: 18000, desc: "إيجار المكتب" },
    { cat: "salaries", amount: 42000, desc: "مرتبات الموظفين" },
    { cat: "utilities", amount: 3200, desc: "كهرباء وإنترنت" },
    { cat: "marketing", amount: 7500, desc: "إعلانات فيسبوك و OLX" },
    { cat: "transport", amount: 2600, desc: "مواصلات ومعاينات" },
  ];
  for (let m = 0; m < 6; m++) {
    expenses.forEach((e, j) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - m);
      d.setDate(3 + j);
      list.push({
        id: `t-out-${m}-${j}`,
        kind: "expense",
        category: e.cat,
        amount: Math.round(e.amount * (0.85 + ((m + j) % 5) * 0.08)),
        description: `${e.desc} — ${d.getFullYear()}/${d.getMonth() + 1}`,
        tx_date: d.toISOString().slice(0, 10),
        contract_id: null,
        created_by: "u-admin",
        created_at: d.toISOString(),
      });
    });
  }
  // إيراد إضافي متنوع
  for (let m = 0; m < 6; m++) {
    list.push({
      id: `t-extra-${m}`,
      kind: "income",
      category: "other_income",
      amount: 5000 + m * 2500,
      description: "خدمات واستشارات عقارية",
      tx_date: `${monthKey(m)}-15`,
      contract_id: null,
      created_by: "u-admin",
      created_at: daysAgo(m * 30 + 15),
    });
  }
  return list;
})();

export const demoData = {
  profiles: demoProfiles,
  properties: demoProperties,
  clients: demoClients,
  leads: demoLeads,
  contracts: demoContracts,
  transactions: demoTransactions,
};

export type DemoDB = typeof demoData;
