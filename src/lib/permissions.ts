import type { Profile } from "@/types";

/**
 * محاكاة صلاحيات Row Level Security على الواجهة.
 * في وضع Supabase الحقيقي الصلاحيات مطبقة في قاعدة البيانات نفسها
 * (شوف supabase/schema.sql)، وهنا نطبق نفس المنطق للوضع التجريبي.
 */
export function scopeRows<T>(
  rows: T[],
  profile: Profile | null,
  isAdmin: boolean,
  ownerKey: keyof T,
): T[] {
  if (isAdmin || !profile) return rows;
  return rows.filter((row) => row[ownerKey] === profile.id);
}

export function canAccessRow(
  ownerId: string | null | undefined,
  profile: Profile | null,
  isAdmin: boolean,
) {
  if (isAdmin) return true;
  return !!ownerId && ownerId === profile?.id;
}
