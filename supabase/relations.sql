-- ============================================================
--  Realty Office — علاقات الجداول (Foreign Keys)
--  Supabase Dashboard -> SQL Editor -> New query -> الصق -> Run
--
--  الملف ده آمن للتشغيل أكثر من مرة:
--    - لو القيد موجود بيتخطاه
--    - لو الجداول مش موجودة هيوقف برسالة واضحة
--
--  عدد العلاقات: 12
-- ============================================================

-- ------------------------------------------------------------
-- 0) التأكد إن الجداول موجودة (يعني schema.sql اتنفذ قبل كده)
-- ------------------------------------------------------------
do $$
declare
  v_missing text;
begin
  select string_agg(t.name, ', ' order by t.name) into v_missing
  from (values
    ('profiles'), ('properties'), ('clients'),
    ('leads'), ('contracts'), ('transactions')
  ) as t(name)
  where not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = t.name
  );

  if v_missing is not null then
    raise exception 'جداول ناقصة: %. نفّذ supabase/schema.sql الأول ثم أعد تشغيل الملف ده.', v_missing;
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) auth.users  ->  profiles   (1 : 1)
--    كل مستخدم في Auth له ملف شخصي واحد
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey') then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- ------------------------------------------------------------
-- 2) profiles  ->  properties   (1 : N)  الموظف المسؤول
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_agent_id_fkey') then
    alter table public.properties
      add constraint properties_agent_id_fkey
      foreign key (agent_id) references public.profiles (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 3) profiles  ->  properties   (1 : N)  اللي أضاف الإعلان
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_created_by_fkey') then
    alter table public.properties
      add constraint properties_created_by_fkey
      foreign key (created_by) references public.profiles (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 4) profiles  ->  clients   (1 : N)  الموظف المسؤول عن العميل
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'clients_assigned_to_fkey') then
    alter table public.clients
      add constraint clients_assigned_to_fkey
      foreign key (assigned_to) references public.profiles (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 5) profiles  ->  leads   (1 : N)  صاحب المتابعة
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_owner_id_fkey') then
    alter table public.leads
      add constraint leads_owner_id_fkey
      foreign key (owner_id) references public.profiles (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 6) profiles  ->  contracts   (1 : N)  الموظف صاحب العمولة
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contracts_agent_id_fkey') then
    alter table public.contracts
      add constraint contracts_agent_id_fkey
      foreign key (agent_id) references public.profiles (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 7) profiles  ->  transactions   (1 : N)  اللي سجّل الحركة
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_created_by_fkey') then
    alter table public.transactions
      add constraint transactions_created_by_fkey
      foreign key (created_by) references public.profiles (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 8) clients  ->  leads   (1 : N)
--    ON DELETE CASCADE: حذف العميل يحذف متابعاته
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_client_id_fkey') then
    alter table public.leads
      add constraint leads_client_id_fkey
      foreign key (client_id) references public.clients (id) on delete cascade;
  end if;
end $$;

-- ------------------------------------------------------------
-- 9) properties  ->  leads   (1 : N)  العقار اللي العميل مهتم بيه
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_property_id_fkey') then
    alter table public.leads
      add constraint leads_property_id_fkey
      foreign key (property_id) references public.properties (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- 10) properties  ->  contracts   (1 : N)
--     ON DELETE RESTRICT: مش هتقدر تحذف عقار مرتبط بعقد
--     (حماية لبيانات العقود والعمولات)
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contracts_property_id_fkey') then
    alter table public.contracts
      add constraint contracts_property_id_fkey
      foreign key (property_id) references public.properties (id) on delete restrict;
  end if;
end $$;

-- ------------------------------------------------------------
-- 11) clients  ->  contracts   (1 : N)
--     ON DELETE RESTRICT: مش هتقدر تحذف عميل ليه عقود
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contracts_client_id_fkey') then
    alter table public.contracts
      add constraint contracts_client_id_fkey
      foreign key (client_id) references public.clients (id) on delete restrict;
  end if;
end $$;

-- ------------------------------------------------------------
-- 12) contracts  ->  transactions   (1 : N)
--     العمولة المسددة مرتبطة بالعقد، ولو العقد اتحذف الحركة تفضل
-- ------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_contract_id_fkey') then
    alter table public.transactions
      add constraint transactions_contract_id_fkey
      foreign key (contract_id) references public.contracts (id) on delete set null;
  end if;
end $$;

-- ------------------------------------------------------------
-- فهارس على أعمدة العلاقات (بتسرّع البحث والفلترة)
-- ------------------------------------------------------------
create index if not exists idx_properties_agent_id    on public.properties (agent_id);
create index if not exists idx_properties_created_by  on public.properties (created_by);
create index if not exists idx_clients_assigned_to    on public.clients (assigned_to);
create index if not exists idx_leads_owner_id         on public.leads (owner_id);
create index if not exists idx_leads_client_id        on public.leads (client_id);
create index if not exists idx_leads_property_id      on public.leads (property_id);
create index if not exists idx_contracts_agent_id     on public.contracts (agent_id);
create index if not exists idx_contracts_property_id  on public.contracts (property_id);
create index if not exists idx_contracts_client_id    on public.contracts (client_id);
create index if not exists idx_transactions_created_by on public.transactions (created_by);
create index if not exists idx_transactions_contract_id on public.transactions (contract_id);

-- ------------------------------------------------------------
-- نتيجة التشغيل: خريطة العلاقات اللي اتعملت
-- ------------------------------------------------------------
select
  tc.constraint_name                              as relation,
  kcu.table_name                                  as from_table,
  kcu.column_name                                 as from_column,
  ccu.table_name                                  as to_table,
  ccu.column_name                                 as to_column,
  rc.delete_rule                                  as on_delete
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema   = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema   = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by kcu.table_name, kcu.column_name;
