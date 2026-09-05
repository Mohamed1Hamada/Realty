# علاقات الجداول في Realty Office

> الملف الجاهز للتنفيذ: **`supabase/relations.sql`**
> الرسم التوضيحي: **`docs/erd.svg`**

---

## خريطة العلاقات

```
auth.users (1) ──── (1) profiles
                          │
        ┌─────────────────┼──────────────────┬─────────────────┐
        │                 │                  │                 │
        ▼                 ▼                  ▼                 ▼
   properties         clients              leads          transactions
        │                 │                  ▲                 ▲
        │                 └──────►───────────┤                 │
        │                                    │                 │
        └──────────────►─────────────────────┘                 │
        │                                                      │
        └──────────────►────────── contracts ─────────────────┘
                                              ▲
                              clients ────────┘
```

---

## الـ 12 علاقة بالتفصيل

| # | من (جدول.عمود) | إلى (جدول.عمود) | عند الحذف | المعنى |
|---|---|---|---|---|
| 1 | `profiles.id` | `auth.users.id` | **CASCADE** | كل مستخدم في Auth له ملف شخصي واحد، ولو المستخدم اتحذف ملفه يروح معاه |
| 2 | `properties.agent_id` | `profiles.id` | **SET NULL** | الموظف المسؤول عن العقار — لو اتحذف حسابه، العقار يفضل |
| 3 | `properties.created_by` | `profiles.id` | **SET NULL** | مين اللي أضاف الإعلان |
| 4 | `clients.assigned_to` | `profiles.id` | **SET NULL** | الموظف المسؤول عن العميل |
| 5 | `leads.owner_id` | `profiles.id` | **SET NULL** | صاحب المتابعة |
| 6 | `contracts.agent_id` | `profiles.id` | **SET NULL** | الموظف اللي ليه العمولة |
| 7 | `transactions.created_by` | `profiles.id` | **SET NULL** | مين سجّل الحركة المالية |
| 8 | `leads.client_id` | `clients.id` | **CASCADE** | حذف العميل يحذف متابعاته (مفيش متابعة من غير عميل) |
| 9 | `leads.property_id` | `properties.id` | **SET NULL** | العقار اللي العميل مهتم بيه — اختياري |
| 10 | `contracts.property_id` | `properties.id` | **RESTRICT** | ⚠️ مش هتقدر تحذف عقار مرتبط بعقد |
| 11 | `contracts.client_id` | `clients.id` | **RESTRICT** | ⚠️ مش هتقدر تحذف عميل ليه عقود |
| 12 | `transactions.contract_id` | `contracts.id` | **SET NULL** | الحركة المالية المرتبطة بالعقد |

### ليه الاختيارات دي؟

- **SET NULL** للموظفين: الموظف ممكن يمشي من المكتب، بس العقارات والعملاء والعقود **لازم تفضل** — دي أصول المكتب.
- **CASCADE** من العميل لمتابعاته: المتابعة من غير عميل ملهاش معنى.
- **RESTRICT** على العقود: أهم حماية في النظام. لو حد حذف عقار بالغلط وكان عليه عقد بعمولة مسددة، هتضيع فلوس. القاعدة بترفض الحذف خالص.

> لو محتاج تحذف عقار مرتبط بعقد: احذف العقد الأول (أو غيّر حالته لـ `cancelled`)، وبعدين احذف العقار.

---

## جدول `office_settings`

جدول مستقل **من غير علاقات** — صف واحد بس فيه بيانات المكتب (الاسم، المدينة، التليفون، لون الهوية).

---

## ترتيب التنفيذ

```
1. supabase/schema.sql      ← الجداول + Enums + Triggers + RLS + Storage
2. supabase/relations.sql   ← العلاقات (اختياري لو نفّذت schema.sql، لأنها موجودة فيه)
3. supabase/seed.sql        ← البيانات التجريبية
```

> **ملحوظة مهمة:** `schema.sql` بيعمل كل العلاقات دي بالفعل أثناء إنشاء الجداول.
> ملف `relations.sql` موجود لحالتين:
> 1. لو عملت الجداول يدوي من **Table Editor** في Supabase وعايز تضيف العلاقات.
> 2. لو عايز تتأكد إن كل العلاقات موجودة ومظبوطة (الملف بيعرض لك جدول النتيجة في الآخر).

الملف **آمن للتشغيل أكتر من مرة** — بيفحص `pg_constraint` قبل ما يضيف أي قيد.

---

## استعلامات جاهزة للتأكد إن العلاقات شغالة

### 1) اعرض كل العلاقات في القاعدة
```sql
select
  kcu.table_name   as from_table,
  kcu.column_name  as from_column,
  ccu.table_name   as to_table,
  ccu.column_name  as to_column,
  rc.delete_rule   as on_delete
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name and rc.constraint_schema = tc.table_schema
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by 1, 2;
```

المفروض تطلع **12 صف**.

### 2) عقارات من غير موظف مسؤول (يتيمة)
```sql
select ref_code, title, district from properties where agent_id is null;
```

### 3) متابعات من غير عقار محدد
```sql
select l.id, c.full_name, l.stage, l.next_followup_at
from leads l join clients c on c.id = l.client_id
where l.property_id is null
order by l.next_followup_at;
```

### 4) تقرير موظف كامل بالعلاقات
```sql
select
  p.full_name,
  count(distinct pr.id)  as properties,
  count(distinct cl.id)  as clients,
  count(distinct ct.id)  as contracts,
  coalesce(sum(ct.commission_amount), 0) as total_commission
from profiles p
left join properties pr on pr.agent_id = p.id
left join clients    cl on cl.assigned_to = p.id
left join contracts  ct on ct.agent_id = p.id and ct.status <> 'cancelled'
group by p.id, p.full_name
order by total_commission desc;
```

> فيه نسخة جاهزة كـ View في `schema.sql` اسمها `v_agent_performance`.

### 5) عميل بكل علاقاته (عقارات مهتم بيها + عقود + متابعات)
```sql
select
  c.full_name,
  l.stage,
  l.next_followup_at,
  pr.ref_code,
  pr.title,
  ct.contract_no,
  ct.total_amount
from clients c
left join leads l      on l.client_id = c.id
left join properties pr on pr.id = l.property_id
left join contracts ct  on ct.client_id = c.id
where c.id = 'حط-هنا-uuid-العميل'
order by l.next_followup_at;
```

---

## شوف الرسم في Supabase نفسه

**Supabase Dashboard → Database → Diagrams** بيعرض لك نفس الخريطة تلقائيًا من القاعدة.
قارنها بـ `docs/erd.svg` — لو في سهم ناقص، شغّل `relations.sql`.
