import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/auth/auth-context";

/* محاكاة وضع live: supabase موجود بس مفيش جلسة لسه (مستخدم لسه داخل) */
vi.mock("@/lib/supabase", () => ({
  appMode: "live",
  hasSupabaseCredentials: true,
  TABLES: {
    profiles: "profiles",
    properties: "properties",
    clients: "clients",
    leads: "leads",
    contracts: "contracts",
    transactions: "transactions",
  },
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
      signInWithPassword: async () => ({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      }),
      signOut: async () => {},
    },
    from: () => {
      throw new Error("from() not expected in this test");
    },
  },
}));

function Probe() {
  const { loading, profile } = useAuth();
  if (loading) return <div>LOADING</div>;
  return <div>{profile ? "APP" : "LOGIN"}</div>;
}

describe("وضع live من غير جلسة", () => {
  it("يخرج من شاشة التحميل ويعرض الدخول (مش سبينر للأبد)", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(
      () => expect(screen.getByText("LOGIN")).toBeTruthy(),
      { timeout: 3000 },
    );
  });
});
