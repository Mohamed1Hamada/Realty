/** أنواع الوحدات العقارية */
export type PropertyType =
  | "apartment"
  | "duplex"
  | "villa"
  | "studio"
  | "land"
  | "shop"
  | "office"
  | "building"
  | "warehouse"
  | "farm";

/** الغرض من الإعلان */
export type PropertyPurpose = "sale" | "rent";

/** حالة الإعلان */
export type PropertyStatus =
  | "available"
  | "reserved"
  | "sold"
  | "rented"
  | "off_market";

export type Finishing =
  | "super_lux"
  | "fully_finished"
  | "semi_finished"
  | "core_shell"
  | "needs_renovation";

export type Role = "admin" | "staff";

export type ClientKind = "buyer" | "seller" | "both";
export type ClientStatus = "lead" | "active" | "closed" | "lost";
export type ClientSource =
  | "facebook"
  | "referral"
  | "walk_in"
  | "olx"
  | "phone"
  | "other";

export type LeadStage =
  | "new"
  | "contacted"
  | "viewing"
  | "negotiation"
  | "won"
  | "lost";

export type ContractType = "sale" | "rent";
export type ContractStatus = "draft" | "active" | "completed" | "cancelled";

export type TxKind = "income" | "expense";
export type TxCategory =
  | "commission"
  | "rent_collection"
  | "other_income"
  | "office_rent"
  | "utilities"
  | "salaries"
  | "marketing"
  | "maintenance"
  | "transport"
  | "other_expense";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface Property {
  id: string;
  ref_code: string;
  title: string;
  description: string | null;
  purpose: PropertyPurpose;
  type: PropertyType;
  status: PropertyStatus;
  area_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_no: number | null;
  total_floors: number | null;
  finishing: Finishing | null;
  price: number;
  rent_period: "monthly" | "yearly" | null;
  governorate: string;
  district: string;
  address: string | null;
  images: string[];
  owner_name: string | null;
  owner_phone: string | null;
  agent_id: string | null;
  featured: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  kind: ClientKind;
  status: ClientStatus;
  source: ClientSource;
  budget: number | null;
  notes: string | null;
  assigned_to: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  client_id: string;
  property_id: string | null;
  stage: LeadStage;
  next_followup_at: string | null;
  notes: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  contract_no: string;
  type: ContractType;
  property_id: string;
  client_id: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  paid_amount: number;
  status: ContractStatus;
  sign_date: string;
  start_date: string | null;
  end_date: string | null;
  agent_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  category: TxCategory;
  amount: number;
  description: string | null;
  tx_date: string;
  contract_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalProperties: number;
  availableProperties: number;
  soldRented: number;
  totalClients: number;
  activeLeads: number;
  totalContracts: number;
  commissionEarned: number;
  incomeTotal: number;
  expenseTotal: number;
  netProfit: number;
  byPurpose: { sale: number; rent: number };
  byType: { key: PropertyType; value: number }[];
  monthly: { month: string; income: number; expense: number }[];
  topAgents: { name: string; value: number }[];
  recentActivity: {
    id: string;
    kind: string;
    title: string;
    date: string;
  }[];
}

export type PropertyFilters = {
  search?: string;
  purpose?: PropertyPurpose | "all";
  type?: PropertyType | "all";
  status?: PropertyStatus | "all";
  district?: string;
  minPrice?: number;
  maxPrice?: number;
};
