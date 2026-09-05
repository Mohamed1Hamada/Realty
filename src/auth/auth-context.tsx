import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Profile } from "@/types";
import { appMode, supabase, TABLES } from "@/lib/supabase";
import { store } from "@/data/store";
import { siteConfig } from "@/config/site.config";

const DEMO_PASSWORD = "123456";
const SESSION_KEY = "realty-demo-session";

/**
 * الدخول بيوزر نيم فقط.
 * Supabase Auth بيحتاج بريد داخليًا، فبنلصق دومين المكتب تلقائيًا:
 *   admin -> admin@realty-office.app
 * البريد ده داخلي ومش بيظهر لأي حد — اليوزر بيكتب اسمه بس.
 */
export function toAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${siteConfig.authDomain}`;
}

interface AuthState {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initLive() {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return;
      const { data: row } = await supabase
        .from(TABLES.profiles)
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (active && row) setProfile(row as Profile);
    }

    if (appMode === "live") {
      void initLive().finally(() => {
        // مهم: حتى لو مفيش جلسة لسه، لازم نفضّل حالة التحميل
        // عشان الصفحة توصل لشاشة الدخول بدل ما تفضل سبينر للأبد
        if (active) setLoading(false);
      });
      const { data: sub } = supabase!.auth.onAuthStateChange(
        async (_event, session) => {
          if (!session?.user) {
            setProfile(null);
            return;
          }
          const { data: row } = await supabase!
            .from(TABLES.profiles)
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();
          if (active) setProfile(row as Profile);
        },
      );
      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    }

    // وضع العرض: جلسة محلية
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      const row = store
        .table("profiles")
        .find((p) => p.id === saved) as Profile | undefined;
      if (row?.is_active) setProfile(row);
    }
    setLoading(false);
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback<AuthState["signIn"]>(async (identifier, password) => {
    if (appMode === "live") {
      if (!supabase) return { error: "Supabase غير مُعد" };
      const { data, error } = await supabase.auth.signInWithPassword({
        email: toAuthEmail(identifier),
        password,
      });
      if (error || !data.user) return { error: error?.message ?? "login failed" };
      const { data: row, error: profileError } = await supabase
        .from(TABLES.profiles)
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profileError || !row)
        return { error: "لا يوجد ملف شخصي مرتبط بالحساب — أنشئه في جدول profiles" };
      if (!(row as Profile).is_active)
        return { error: "الحساب موقوف من مدير المكتب" };
      setProfile(row as Profile);
      setLoading(false);
      return {};
    }

    const idn = identifier.trim().toLowerCase();
    const row = store
      .table("profiles")
      .find((p) => p.email.toLowerCase().startsWith(`${idn}@`));
    if (!row || password !== DEMO_PASSWORD) return { error: "invalid" };
    if (!row.is_active) return { error: "inactive" };
    localStorage.setItem(SESSION_KEY, row.id);
    setProfile(row as Profile);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    if (appMode === "live" && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      signIn,
      signOut,
    }),
    [profile, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
