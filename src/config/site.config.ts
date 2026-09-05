/**
 * ============================================================
 *  ملف الهوية والإعدادات العامة للنظام
 *  غيّر القيم دي لكل عميل قبل التسليم — مش محتاج تلمس أي كود تاني
 * ============================================================
 */
export const siteConfig = {
  /** اسم المكتب كما يظهر في الشريط الجانبي وصفحة الدخول */
  name: "Realty Office",
  /** الاسم بالعربي */
  nameAr: "مكتب العقارات",
  /** سطر تعريفي قصير */
  tagline: "نظام إدارة مكاتب العقارات",
  taglineEn: "Real Estate Office Management",
  /** المدينة / الفرع */
  city: "Cairo",
  cityAr: "القاهرة",
  phone: "+20 100 000 0000",
  email: "info@realty-office.com",
  /** إصدار النظام (يظهر في الإعدادات) */
  version: "1.0.0",
  /** العملة الافتراضية */
  currency: "EGP",
  currencySymbol: "ج.م",
  /**
   * دومين تسجيل الدخول:
   * المستخدم بيدخل بـ "اسم مستخدم" والنظام بيحوّله داخليًا لبريد
   * على الدومين ده (Supabase Auth شغال بالبريد).
   * مثال: اسم المستخدم admin → admin@realty-office.app
   */
  authDomain: "realty-office.app",
  /** الحرفين المختصرين للشعار */
  logoInitials: "RO",
} as const;

/**
 * الألوان الافتراضية. لو العميل طلب لون مختلف، غيّر قيم HSL
 * في ملف src/index.css تحت :root (أو استخدم setBrandColor).
 */
export function setBrandColor(primaryHsl: string) {
  document.documentElement.style.setProperty("--primary", primaryHsl);
}
