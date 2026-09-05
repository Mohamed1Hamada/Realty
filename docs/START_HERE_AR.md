# ابدأ من هنا — من صفر لحد ما النظام شغال

> اقرأ الخطوات بالترتيب. كل خطوة فيها **✅ نقطة توقف** تقولك تعمل إيه بعدها.
> الوقت الكلي: 30–40 دقيقة. التكلفة: **صفر**.

---

## المرحلة 1: إنشاء مشروع Supabase (10 دقايق)

### 1. اعمل حساب
- افتح [supabase.com](https://supabase.com)
- اضغط **Start your project**
- سجّل بحساب **GitHub** (الأسهل) أو Google أو إيميل عادي

**✅ نقطة توقف:** لما تشوف صفحة الـ Projects (حتى لو فاضية) → كمّل.

---

### 2. اعمل مشروع جديد
- اضغط **New Project**
- **Organization**: اختار `Personal` (أو اسم مكتبك لو موجود)
- **Project name**: اسم بالإنجليزي من غير مسافات، مثلاً `realty-benisuef`
- **Database Password**: اضغط **Generate a password**
  > ⚠️ **احفظها في مكان آمن** — Note على الموبايل أو ملف. مش هتحتاجها في الكود، بس لو ضاعت هتتعب.
- **Region**: اختار **Central EU (Frankfurt)** — أقرب منطقة لمصر وأسرع استجابة
  > معرفها التقني `eu-central-1`. Region مش بيتغيّر بعد إنشاء المشروع، فاختاره صح من الأول.
- **Plan**: سيبه **Free**
- اضغط **Create new project**

**✅ نقطة توقف:** استنى دقيقة لحد ما المشروع يجهز وتدخل على الـ Dashboard → كمّل.

---

## المرحلة 2: إنشاء الجداول (5 دقايق)

### 3. شغّل `schema.sql`
- من القائمة الشمال: **SQL Editor** → **New query**
- افتح ملف `supabase/schema.sql` من المشروع، **انسخه كله** والصقه
- اضغط **Run** (أو `Ctrl + Enter`)
- المفروض تشوف في الآخر: `schema created`

ده بيعمل: 7 جداول + العلاقات الـ 12 + الصلاحيات (RLS) + مجلد الصور + المحفزات التلقائية.

**✅ نقطة توقف:** لو طلع خطأ، ابعتلي رسالة الخطأ زي ما هي. لو طلعت `schema created` → كمّل.

---

### 4. اتأكد إن الجداول اتعملت
- من القائمة: **Table Editor**
- المفروض تشوف: `profiles` · `properties` · `clients` · `leads` · `contracts` · `transactions` · `office_settings`

**✅ نقطة توقف:** 7 جداول موجودين → كمّل.

---

## المرحلة 3: المستخدمين (5 دقايق)

### 5. اعمل حساب المدير (بيوزر نيم)
الدخول في النظام **بيوزر نيم فقط**. Supabase بيحتاج بريد داخليًا، فبنستخدم صيغة
`اسم-المستخدم@realty-office.app` — والبريد ده داخلي ومش بيظهر لحد.

- **Authentication** → **Users** → **Add user** → **Create new user**
- **Email**: `admin@realty-office.app`  (أي اسم تحبه + `@realty-office.app`)
- **Password**: اللي انت عايزه
- ✅ فعّل **Auto Confirm User**
- **Create user**

### 6. رقّيه لمدير
ارجع **SQL Editor** وشغّل:

```sql
update public.profiles
set role = 'admin', full_name = 'اسم المدير'
where email = 'admin@realty-office.app';
```

> جدول `profiles` بيتعبّى لوحده تلقائيًا لأي مستخدم جديد (Trigger اسمه `handle_new_user`).
> افتراضيًا كل مستخدم جديد بيكون `staff` — فالمدير لازم ترقّيه يدوي بالخطوة دي.

**✅ نقطة توقف:** في التطبيق اكتب اسم المستخدم `admin` + كلمة السر → المفروض تدخل. لو دخلت → كمّل.

---

### 7. اعمل حسابات الموظفين
كرر الخطوة 5 لكل موظف: `sara@realty-office.app` مثلًا، ويدخل بيكتب `sara`.
(الموظفين `staff` تلقائيًا — مش محتاج ترقية.)

---

### 8. (اختياري) إنشاء الموظفين من جوه التطبيق بدل Supabase
عشان تضيف موظف من صفحة «الموظفين» في النظام مباشرة (يوزر نيم + كلمة سر + صلاحية)،
لازم تنشر **وظيفة صغيرة** مرة واحدة تحتفظ بالمفتاح السري:

1. لوحة Supabase → **Edge Functions** → **Create a new function**
2. الاسم: `create-account` → **Create**
3. امسح الكود الافتراضي والصق محتوى الملف `supabase/functions/create-account/index.ts`
4. **Deploy**

> الوظيفة بتستخدم `SUPABASE_SERVICE_ROLE_KEY` المتاح تلقائيًا في Edge Functions.
> لو ظهر خطأ إنه مش موجود: **Edge Functions → Secrets** وضيف `SUPABASE_SERVICE_ROLE_KEY`
> بقيمته من **Project Settings → API → service_role (secret)**.

بعد كده، «إضافة موظف» في التطبيق هتعمل الحساب ويقدر يدخل على طول — من غير Supabase.

---

## المرحلة 4: ربط النظام (5 دقايق)

### 8. هات المفاتيح
- **Project Settings** (أيقونة الترس ⚙️) → **API**
- انسخ:
  - **Project URL** → شكله `https://abcdefgh.supabase.co`
  - **anon public** key → سلسلة طويلة بتبدأ بـ `eyJ...`

> ⚠️ **ماتديش حد `service_role` key** — ده بيتخطى كل الصلاحيات.
> الـ `anon` key آمن لأن Row Level Security بتحميه.

### 9. اربط النظام
في مجلد المشروع:

```bash
cp .env.example .env
```

وعدّل `.env`:

```env
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
VITE_APP_ENV=live
```

بعدين:

```bash
npm install
npm run dev
```

**✅ نقطة توقف:** في أسفل الشريط الجانبي هتلاقي كلمة **Supabase** بدل **تجريبي** → يعني الاتصال تمام 🎉

---

## المرحلة 5 (اختياري): بيانات للتجربة

### 10. شغّل `seed.sql`
> ⚠️ السكربت ده بيستخدم 4 حسابات جاهزة (`admin@realty.app` و `sara@` و `khaled@` و `mona@`)
> ولازم تكون موجودة الأول — شوف `docs/SETUP_SUPABASE_AR.md` قسم 4.
> **ومهم تمسح البيانات دي قبل التسليم النهائي للعميل.**

---

## المرحلة 6: النشر على الإنترنت

```bash
npm run build     # يتأكد إن البناء سليم
```

- ارفع المشروع على GitHub
- في [vercel.com](https://vercel.com) → **Add New → Project**
- Framework: **Vite** · Build: `npm run build` · Output: `dist`
- أضف الـ 3 متغيرات في **Environment Variables**
- **Deploy**

---

## جدول ملخص — فين كل حاجة

| عايز تعمل إيه | تروح فين |
|---|---|
| الجداول والعلاقات | SQL Editor → `schema.sql` |
| المستخدمين | Authentication → Users |
| ترقية مدير | SQL Editor → `update profiles set role='admin'` |
| المفاتيح | Project Settings → API |
| بيانات تجريبية | SQL Editor → `seed.sql` |
| صور العقارات | Storage → `property-images` |
| خريطة العلاقات | Database → Diagrams |
| النسخ الاحتياطي | Database → Backups |

---

## الخطة المجانية تكفي؟

أيوه لمكتب واحد: **500 MB قاعدة بيانات** و **1 GB تخزين ملفات** على الخطة المجانية —
ده يساوي عشرات الآلاف من العقارات والعملاء. الصور هي اللي بتاكل مساحة، فلو رفعت صور كتير
ممكن تحتاج ترقية لـ Pro ($25/شهر) لاحقًا.

---

## لو حصل خطأ

| الرسالة | الحل |
|---|---|
| `relation "public.properties" does not exist` | ما شغّلتش `schema.sql` |
| `new row violates row-level security policy` | المستخدم ملوش صف في `profiles` أو `is_active = false` |
| `Invalid login credentials` | فعّل **Auto Confirm User** |
| النظام لسه في وضع "تجريبي" | `VITE_APP_ENV` لازم تكون `live` **و** المفاتيح صح، وبعدين أعد تشغيل `npm run dev` |
| مش قادر تحذف عقار | مرتبط بعقد (RESTRICT) — احذف العقد أو ألغيه الأول |

> الشرح المفصّل في `docs/SETUP_SUPABASE_AR.md` · العلاقات في `docs/RELATIONS_AR.md`
