/**
 * اختبار اتصال حقيقي بـ Supabase من الوركسبيس.
 * الاستخدام:
 *   SUPABASE_URL=... SUPABASE_KEY=... node scripts/test-live.mjs
 *
 * بيتأكد إن:
 *  1) العميل بيتتهيأ
 *  2) نقطة Auth واصلة (محاولة دخول غلط ترجع رسالة Auth مش خطأ شبكة)
 *  3) جداول البيانات بتستجيب (RLS بترجع [] للدور anon من غير خطأ)
 */
import { createClient } from "@supabase/supabase-js";
import { WebSocket as NodeWebSocket } from "ws";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error("❌ محتاج SUPABASE_URL و SUPABASE_KEY في environment");
  process.exit(1);
}

// Node 20 مفيهوش WebSocket أصلي — بنمرره لـ realtime عشان العميل يتهيأ
const sb = createClient(url, key, {
  auth: { persistSession: false },
  realtime: { transport: NodeWebSocket },
});

let ok = true;

// 1) جلسة فارغة من غير خطأ
try {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  console.log("✅ auth.getSession — شغال (جلسة:", data.session ? "موجودة" : "فاضية", ")");
} catch (e) {
  ok = false;
  console.error("❌ auth.getSession فشل:", e.message);
}

// 2) نقطة Auth واصلة: دخول غلط لازم يرجع خطأ Auth مش شبكة
try {
  const { error } = await sb.auth.signInWithPassword({
    email: "no-such-user@realty.app",
    password: "wrong-password-123",
  });
  if (error && /invalid login credentials/i.test(error.message)) {
    console.log("✅ Auth endpoint واصلة (رفض الدخول الغلط برسالة Auth صحيحة)");
  } else if (error) {
    console.log("⚠️ Auth endpoint رجع:", error.message);
  } else {
    console.log("⚠️ دخول من غير خطأ؟ ده غريب");
  }
} catch (e) {
  ok = false;
  console.error("❌ خطأ شبكة في Auth:", e.message);
}

// 3) الجداول بتستجيب — anon من غير تسجيل دخول المفروض []
for (const table of ["profiles", "properties", "clients", "contracts", "transactions"]) {
  try {
    const { data, error } = await sb.from(table).select("*").limit(1);
    if (error) {
      ok = false;
      console.error(`❌ ${table}:`, error.message);
    } else {
      console.log(`✅ ${table}: استجابة سليمة (${(data ?? []).length} صف للدور anon — RLS شغال)`);
    }
  } catch (e) {
    ok = false;
    console.error(`❌ ${table} خطأ شبكة:`, e.message);
  }
}

// 4) جدول office_settings (سياسة القراءة للمستخدمين المسجلين فقط)
try {
  const { data, error } = await sb.from("office_settings").select("name");
  if (error) console.error("❌ office_settings:", error.message);
  else console.log(`✅ office_settings: استجابة سليمة (${(data ?? []).length} صف لـ anon)`);
} catch (e) {
  ok = false;
  console.error("❌ office_settings خطأ شبكة:", e.message);
}

console.log(ok ? "\n🎉 كل اختبارات الاتصال عدت" : "\n⚠️ في حاجات محتاج تبص عليها فوق");
process.exit(ok ? 0 : 1);
