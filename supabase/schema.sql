-- ============================================================
--  Realty Office — مخطط قاعدة البيانات (Supabase / PostgreSQL)
--  انسخ الملف ده بالكامل في: Supabase Dashboard -> SQL Editor -> New query -> Run
--  آمن للتشغيل أكثر من مرة (if not exists)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1) الأنواع (Enums)
-- ------------------------------------------------------------
do $$ begin
  create type public.property_purpose as enum ('sale', 'rent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_type as enum (
    'apartment','duplex','villa','studio','land',
    'shop','office','building','warehouse','farm'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.property_status as enum (
    'available','reserved','sold','rented','off_market'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.finishing_type as enum (
    'super_lux','fully_finished','semi_finished','core_shell','needs_renovation'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('admin','staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.client_kind as enum ('buyer','seller','both');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.client_status as enum ('lead','active','closed','lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.client_source as enum ('facebook','referral','walk_in','olx','phone','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lead_stage as enum ('new','contacted','viewing','negotiation','won','lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contract_type as enum ('sale','rent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contract_status as enum ('draft','active','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_kind as enum ('income','expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_category as enum (
    'commission','rent_collection','other_income',
    'office_rent','utilities','salaries','marketing','maintenance','transport','other_expense'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- 2) الجداول
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           text not null unique,
  full_name       text not null,
  phone           text,
  role            public.user_role not null default 'staff',
  commission_rate numeric(5,2) not null default 1.00 check (commission_rate >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.properties (
  id           uuid primary key default gen_random_uuid(),
  ref_code     text not null unique,
  title        text not null,
  description  text,
  purpose      public.property_purpose not null default 'sale',
  type         public.property_type not null default 'apartment',
  status       public.property_status not null default 'available',
  area_sqm     numeric(10,2) check (area_sqm is null or area_sqm > 0),
  bedrooms     smallint check (bedrooms is null or bedrooms >= 0),
  bathrooms    smallint check (bathrooms is null or bathrooms >= 0),
  floor_no     smallint,
  total_floors smallint,
  finishing    public.finishing_type,
  price        numeric(14,2) not null default 0 check (price >= 0),
  rent_period  text check (rent_period is null or rent_period in ('monthly','yearly')),
  governorate  text not null default '',
  district     text not null default '',
  address      text,
  images       text[] not null default '{}',
  owner_name   text,
  owner_phone  text,
  agent_id     uuid references public.profiles (id) on delete set null,
  featured     boolean not null default false,
  notes        text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  phone       text not null,
  email       text,
  kind        public.client_kind not null default 'buyer',
  status      public.client_status not null default 'lead',
  source      public.client_source not null default 'facebook',
  budget      numeric(14,2) check (budget is null or budget >= 0),
  notes       text,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients (id) on delete cascade,
  property_id      uuid references public.properties (id) on delete set null,
  stage            public.lead_stage not null default 'new',
  next_followup_at date,
  notes            text,
  owner_id         uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.contracts (
  id                uuid primary key default gen_random_uuid(),
  contract_no       text not null unique,
  type              public.contract_type not null default 'sale',
  property_id       uuid not null references public.properties (id) on delete restrict,
  client_id         uuid not null references public.clients (id) on delete restrict,
  total_amount      numeric(14,2) not null default 0 check (total_amount >= 0),
  commission_rate   numeric(5,2) not null default 1 check (commission_rate >= 0),
  commission_amount numeric(14,2) not null default 0 check (commission_amount >= 0),
  paid_amount       numeric(14,2) not null default 0 check (paid_amount >= 0),
  status            public.contract_status not null default 'draft',
  sign_date         date not null default current_date,
  start_date        date,
  end_date          date,
  agent_id          uuid references public.profiles (id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  kind        public.tx_kind not null,
  category    public.tx_category not null,
  amount      numeric(14,2) not null check (amount >= 0),
  description text,
  tx_date     date not null default current_date,
  contract_id uuid references public.contracts (id) on delete set null,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- بيانات المكتب (صف واحد)
create table if not exists public.office_settings (
  id         boolean primary key default true check (id),
  name       text not null default 'Realty Office',
  city       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  brand_color text not null default '217 91% 45%',
  updated_at timestamptz not null default now()
);
insert into public.office_settings (id) values (true) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3) الفهارس
-- ------------------------------------------------------------
create index if not exists idx_properties_status   on public.properties (status);
create index if not exists idx_properties_purpose  on public.properties (purpose);
create index if not exists idx_properties_type     on public.properties (type);
create index if not exists idx_properties_district on public.properties (district);
create index if not exists idx_properties_agent    on public.properties (agent_id);
create index if not exists idx_properties_price    on public.properties (price);
create index if not exists idx_clients_assigned    on public.clients (assigned_to);
create index if not exists idx_leads_client        on public.leads (client_id);
create index if not exists idx_leads_owner         on public.leads (owner_id);
create index if not exists idx_leads_followup      on public.leads (next_followup_at);
create index if not exists idx_contracts_agent     on public.contracts (agent_id);
create index if not exists idx_contracts_status    on public.contracts (status);
create index if not exists idx_transactions_date   on public.transactions (tx_date);
create index if not exists idx_transactions_kind   on public.transactions (kind);

-- ------------------------------------------------------------
-- 4) الدوال والمحفّزات (Triggers)
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- كود مرجعي تلقائي للعقار: PR-1001
create or replace function public.assign_property_ref()
returns trigger language plpgsql as $$
declare
  v_seq bigint;
begin
  if new.ref_code is null or new.ref_code = '' then
    select coalesce(max(cast(substring(ref_code from 4) as bigint)), 1000) + 1
      into v_seq from public.properties;
    new.ref_code := 'PR-' || v_seq;
  end if;
  return new;
end $$;

-- العمولة تُحسب تلقائيًا لو المستخدم مملأش القيمة
create or replace function public.calc_commission()
returns trigger language plpgsql as $$
begin
  if new.commission_amount is null or new.commission_amount = 0 then
    new.commission_amount := round(new.total_amount * new.commission_rate / 100, 2);
  end if;
  return new;
end $$;

-- إنشاء ملف شخصي تلقائيًا لأي مستخدم جديد في Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'staff')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_properties_ref on public.properties;
create trigger trg_properties_ref before insert on public.properties
  for each row execute function public.assign_property_ref();

drop trigger if exists trg_properties_updated on public.properties;
create trigger trg_properties_updated before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated on public.clients;
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_leads_updated on public.leads;
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists trg_contracts_commission on public.contracts;
create trigger trg_contracts_commission before insert or update on public.contracts
  for each row execute function public.calc_commission();

drop trigger if exists trg_contracts_updated on public.contracts;
create trigger trg_contracts_updated before update on public.contracts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_transactions_updated on public.transactions;
create trigger trg_transactions_updated before update on public.transactions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_office_settings_updated on public.office_settings;
create trigger trg_office_settings_updated before update on public.office_settings
  for each row execute function public.set_updated_at();

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 5) دالة تحديد المدير
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ------------------------------------------------------------
-- 6) Row Level Security — الصلاحيات
--    المدير: كل البيانات
--    الموظف: بياناته هو بس (العقارات/العملاء/المتابعات/العقود المرتبطة بيه)
--    الحسابات والموظفين: المدير فقط
-- ------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.properties      enable row level security;
alter table public.clients         enable row level security;
alter table public.leads           enable row level security;
alter table public.contracts       enable row level security;
alter table public.transactions    enable row level security;
alter table public.office_settings enable row level security;

-- profiles -------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_admin() or id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_admin());

-- properties -----------------------------------------------
drop policy if exists properties_select on public.properties;
create policy properties_select on public.properties for select to authenticated
  using (
    public.is_admin()
    or agent_id = auth.uid()
    or created_by = auth.uid()
  );

drop policy if exists properties_insert on public.properties;
create policy properties_insert on public.properties for insert to authenticated
  with check (public.is_admin() or agent_id = auth.uid() or created_by = auth.uid());

drop policy if exists properties_update on public.properties;
create policy properties_update on public.properties for update to authenticated
  using (public.is_admin() or agent_id = auth.uid() or created_by = auth.uid())
  with check (public.is_admin() or agent_id = auth.uid() or created_by = auth.uid());

drop policy if exists properties_delete on public.properties;
create policy properties_delete on public.properties for delete to authenticated
  using (public.is_admin());

-- clients --------------------------------------------------
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients for select to authenticated
  using (public.is_admin() or assigned_to = auth.uid());

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients for insert to authenticated
  with check (public.is_admin() or assigned_to = auth.uid());

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients for update to authenticated
  using (public.is_admin() or assigned_to = auth.uid())
  with check (public.is_admin() or assigned_to = auth.uid());

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients for delete to authenticated
  using (public.is_admin());

-- leads ----------------------------------------------------
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads for select to authenticated
  using (public.is_admin() or owner_id = auth.uid());

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert to authenticated
  with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update to authenticated
  using (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete to authenticated
  using (public.is_admin());

-- contracts ------------------------------------------------
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select to authenticated
  using (public.is_admin() or agent_id = auth.uid());

drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert to authenticated
  with check (public.is_admin() or agent_id = auth.uid());

drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts for update to authenticated
  using (public.is_admin() or agent_id = auth.uid())
  with check (public.is_admin() or agent_id = auth.uid());

drop policy if exists contracts_delete on public.contracts;
create policy contracts_delete on public.contracts for delete to authenticated
  using (public.is_admin());

-- transactions (الحسابات — المدير فقط) ----------------------
drop policy if exists transactions_all on public.transactions;
create policy transactions_all on public.transactions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- office_settings ------------------------------------------
drop policy if exists office_settings_select on public.office_settings;
create policy office_settings_select on public.office_settings for select to authenticated
  using (true);

drop policy if exists office_settings_update on public.office_settings;
create policy office_settings_update on public.office_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 7) Storage — مجلد صور العقارات
--    (لو Bucket موجود بالفعل هيتخطى الخطوة)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists property_images_read on storage.objects;
create policy property_images_read on storage.objects for select to public
  using (bucket_id = 'property-images');

drop policy if exists property_images_write on storage.objects;
create policy property_images_write on storage.objects for insert to authenticated
  with check (bucket_id = 'property-images');

drop policy if exists property_images_delete on storage.objects;
create policy property_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'property-images');

-- ------------------------------------------------------------
-- 8) عرض جاهز للتقارير (اختياري)
-- ------------------------------------------------------------
create or replace view public.v_agent_performance as
select
  p.id                                   as profile_id,
  p.full_name,
  count(c.id) filter (where c.status <> 'cancelled')       as deals,
  coalesce(sum(c.commission_amount) filter (where c.status <> 'cancelled'), 0) as total_commission,
  coalesce(sum(c.paid_amount) filter (where c.status <> 'cancelled'), 0)       as paid_commission
from public.profiles p
left join public.contracts c on c.agent_id = p.id
group by p.id, p.full_name;

-- تم ✅
select 'schema created' as status;
