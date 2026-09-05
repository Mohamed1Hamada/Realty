// إنشاء حساب موظف من جوه النظام — المدير بس يقدر يستخدمها.
// الوظيفة دي بتشتغل على سيرفر Supabase وبتحمل المفتاح السري (service_role)
// فمفيش أي مفتاح سري بيتعرّض في المتصفح.
//
// النشر (مرة واحدة): لوحة Supabase → Edge Functions → Create → الاسم: create-account → انسخ الكود → Deploy.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DOMAIN = Deno.env.get("AUTH_DOMAIN") ?? "realty-office.app";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1) نتأكد إن اللي بيكلمنا مستخدم حقيقي ومصرّح له
    const authHeader = req.headers.get("Authorization") ?? "";
    const asUser = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await asUser.auth.getUser();
    if (userErr || !user) return json({ error: "غير مصرّح — سجّل دخول الأول" }, 401);

    // 2) نتأكد إنه مدير
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: me } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (me?.role !== "admin") return json({ error: "للمدير فقط" }, 403);

    // 3) نقرأ البيانات
    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.full_name ?? "").trim();
    const role = body.role === "admin" ? "admin" : "staff";
    const commissionRate = Number(body.commission_rate ?? 1) || 0;
    const isActive = body.is_active !== false;
    const phone = body.phone ? String(body.phone) : null;

    if (!/^[a-z0-9_.-]{3,}$/i.test(username))
      return json({ error: "اسم المستخدم غير صالح" }, 400);
    if (password.length < 6)
      return json({ error: "كلمة المرور لازم 6 حروف على الأقل" }, 400);
    if (fullName.length < 3) return json({ error: "الاسم قصير" }, 400);

    const email = `${username}@${DOMAIN}`;

    // 4) ننشئ المستخدم في Auth (مفعّل على طول من غير تأكيد إيميل)
    //    الـ Trigger handle_new_user هيعمل صف في profiles بالاسم والصلاحية.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (createErr) {
      const msg = /already|exist/i.test(createErr.message)
        ? "اسم المستخدم ده مستخدم بالفعل"
        : createErr.message;
      return json({ error: msg }, 400);
    }

    // 5) نكمّل باقي بيانات الموظف (نسبة العمولة، التليفون، الحالة)
    await admin
      .from("profiles")
      .update({
        commission_rate: commissionRate,
        is_active: isActive,
        phone,
        full_name: fullName,
        role,
      })
      .eq("id", created.user.id);

    return json({ ok: true, id: created.user.id, username });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
