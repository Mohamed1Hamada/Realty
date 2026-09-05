# ربط النظام بـ Supabase — خطوة بخطوة

> الدليل ده مكتوب لمكتب واحد (Single-tenant): كل عميل له مشروع Supabase مستقل.
> الوقت التقريبي: 20–30 دقيقة.

---

## 1) إنشاء حساب ومشروع

1. ادخل على [supabase.com](https://supabase.com) واعمل حساب (ممكن بحساب GitHub).
2. اضغط **New project**.
3. اختار:
   - **Name**: اسم العميل، مثلاً `realty-mokattam`
   - **Database Password**: كلمة قوية — **احفظها في مكان آمن** (مش هتحتاجها في الكود، بس مطلوبة للدخول على القاعدة).
   - **Region**: الأقرب للعميل — لمصر اختار `Frankfurt` أو `London`.
4. استنى دقيقة لحد ما المشروع يجهز.

---

## 2) تنفيذ مخطط قاعدة البيانات

1. من القائمة الجانبية: **SQL Editor** → **New query**.
2. افتح ملف `supabase/schema.sql` من المشروع، انسخه كامل والصقه.
3. اضغط **Run** (أو `Ctrl+Enter`).
4. المفروض تشوف في آخر النتيجة: `schema created`.

> الملف ده بينشئ: الجداول، الأنواع (enums)، الفهارس، المحفّزات (auto ref_code، auto commission، updated_at)،
> صلاحيات Row Level Security، ومجلد الصور `property-images`.
> آمن للتشغيل أكتر من مرة.

---

## 3) إنشاء المستخدمين

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. املأ البريد وكلمة المرور، وفعّل **Auto Confirm User** (عشان العميل يدخل على طول).
3. كرّر الخطوة لكل موظف. أول مستخدم (صاحب المكتب) لازم يكون المدير.

**الدخول بيوزر نيم فقط:**
اعمل الحساب بالبريد الداخلي `اسم-المستخدم@realty-office.app` (مثلاً `admin@realty-office.app`)،
واليوزر نيم في التطبيق هو الجزء اللي قبل @ (`admin`). البريد ده داخلي ومش بيظهر للمستخدم.

**ترقية أول حساب ليكون مدير:**
بعد إنشاء المستخدم، افتح **SQL Editor** وشغّل:

```sql
update public.profiles set role = 'admin', full_name = 'اسم المدير' where email = 'admin@realty-office.app';
```

> ملاحظة: جدول `profiles` بيتعبّى تلقائيًا لأي مستخدم جديد عن طريق Trigger اسمه `handle_new_user`.
> لو ظهر صف بـ `role = staff` فده طبيعي — عدّله لـ `admin` للمدير.

---

## 4) (اختياري) إضافة بيانات تجريبية للتجربة قبل التسليم

1. أنشئ 4 مستخدمين بالتوقيت ده بالظبط:
   - `admin@realty.app`
   - `sara@realty.app`
   - `khaled@realty.app`
   - `mona@realty.app`
2. شغّل:
   ```sql
   update public.profiles set role = 'admin' where email = 'admin@realty.app';
   ```
3. افتح `supabase/seed.sql` والصقه في **SQL Editor** وشغّله.
4. هتظهر لك النتيجة: `14 عميل، 25 عقار، 20 متابعة، 9 عقود + الحركات`.

> السكربت بيرفض التشغيل لو في عقارات موجودة بالفعل، عشان ميكررش البيانات.
> **امسح البيانات التجريبية قبل التسليم النهائي** — شوف قسم 8.

---

## 5) مفاتيح الاتصال

1. **Project Settings** (أيقونة الترس) → **API**.
2. انسخ:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> ⚠️ **ماتستخدمش `service_role` key في الواجهة أبدًا** — ده بيتخطى كل الصلاحيات.
> المفتاح `anon` آمن لأنه محكوم بـ Row Level Security اللي عملناها في الخطوة 2.

---

## 6) تشغيل النظام على الوضع الحقيقي

في مجلد المشروع:

```bash
cp .env.example .env
```

ثم عدّل `.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_APP_ENV=live
```

وشغّل:

```bash
npm install
npm run dev
```

هتلاقي في أسفل الشريط الجانبي كلمة **Supabase** بدل **تجريبي** — ده معناه الاتصال تمام.

---

## 7) إعدادات إضافية مطلوبة للإنتاج

### أ) Authentication — إعدادات الدخول
**Authentication → Providers → Email**: تأكد إنه **Enabled**.
**Authentication → URL Configuration**:
- **Site URL**: دومين النظام بعد النشر (مثلاً `https://mokattam.vercel.app`)
- **Redirect URLs**: أضف نفس الدومين + `http://localhost:5173` للتطوير.

### ب) إعدادات الأمان
**Project Settings → API → CORS**: اتركها الافتراضية.
**Authentication → Policies**: فعّل **Rate limiting** الافتراضي.

### ج) النسخ الاحتياطي
**Database → Backups**: الخطة المجانية فيها 7 أيام نسخ يومية. لو العميل محتاج أكتر، فعّل **Point in Time Recovery** من خطة Pro.

### د) رفع صور العقارات
Bucket باسم `property-images` اتعمل تلقائيًا في الخطوة 2 (عام للقراءة).
ارفع الصور من **Storage → property-images** أو من داخل النظام بعد تفعيل رفع الملفات.
الرابط العام للصورة شكله:
```
https://xxxxxxxxxxxx.supabase.co/storage/v1/object/public/property-images/اسم-الملف.jpg
```
الصقه في حقل **روابط الصور** في نموذج العقار.

---

## 8) تنظيف البيانات التجريبية قبل التسليم

```sql
delete from public.transactions;
delete from public.contracts;
delete from public.leads;
delete from public.properties;
delete from public.clients;
-- اترك جدول profiles (المستخدمين الحقيقيين) كما هو
```

بعدها احذف حسابات التجربة من **Authentication → Users**.

---

## 9) استكشاف الأخطاء

| المشكلة | السبب والحل |
|---|---|
| `relation "public.properties" does not exist` | لم تنفّذ `schema.sql` — ارجع للخطوة 2 |
| `new row violates row-level security policy` | المستخدم ليس لديه `profiles` row أو الحساب `is_active = false` |
| الموظف لا يرى البيانات | طبيعي: RLS بيقيّده على بياناته. راجع `agent_id` / `assigned_to` / `owner_id` |
| الصفحة تفضل في وضع "تجريبي" | `VITE_APP_ENV` لازم تكون `live` **و** المفاتيح صحيحة، ثم أعد تشغيل `npm run dev` |
| `Invalid login credentials` | تأكد من تفعيل **Auto Confirm User** أو اضغط تأكيد من الإيميل |
| لا يستطيع المدير رؤية جدول الحسابات | جدول `transactions` للمدير فقط — تأكد من `role = 'admin'` في `profiles` |

---

## 10) نشر النظام على الإنترنت (Vercel)

```bash
npm run build      # يتأكد إن البناء سليم
```

1. ارفع المشروع على GitHub.
2. في [vercel.com](https://vercel.com) → **Add New → Project** → اختار المستودع.
3. الإعدادات:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. في **Environment Variables** أضف الثلاث متغيرات من `.env`.
5. **Deploy**.

> لو النظام SPA (بدون سيرفر)، أضف ملف `vercel.json` لتوجيه كل الروابط لـ `index.html`:
> ```json
> { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
> ```
