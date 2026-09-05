import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, KeyRound, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/auth-context";
import { siteConfig } from "@/config/site.config";
import { appMode } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitch } from "@/components/layout/language-switch";

const DEMO_ACCOUNTS = [
  { labelKey: "auth.adminAccount", username: "admin" },
  { labelKey: "auth.staffAccount", username: "sara" },
];

export function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail = email, nextPassword = password) {
    if (!nextEmail || !nextPassword) return;
    setBusy(true);
    const { error } = await signIn(nextEmail, nextPassword);
    setBusy(false);
    if (error) {
      toast.error(
        error === "inactive"
          ? "الحساب موقوف"
          : error === "invalid"
            ? t("auth.invalidCredentials")
            : error,
      );
      return;
    }
    toast.success(`${t("auth.welcome")} 👋`);
    navigate("/", { replace: true });
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* جزء الهوية */}
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 font-bold">
            {siteConfig.logoInitials}
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">{siteConfig.name}</p>
            <p className="text-xs opacity-80">{siteConfig.taglineEn}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-3xl font-bold leading-snug">
            {siteConfig.tagline}
          </h2>
          <ul className="space-y-3 text-sm opacity-90">
            <li>• إدارة العقارات والإعلانات في مكان واحد</li>
            <li>• متابعة العملاء من أول مكالمة لحد إتمام الصفقة</li>
            <li>• عقود وعمولات وحسابات المكتب</li>
            <li>• تقارير شهرية وصلاحيات للموظفين</li>
          </ul>
        </div>

        <p className="text-xs opacity-70">
          {siteConfig.cityAr} — {siteConfig.phone} · v{siteConfig.version}
        </p>
      </div>

      {/* نموذج الدخول */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-bold">{siteConfig.name}</span>
            </div>
            <LanguageSwitch />
          </div>

          <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("auth.loginSubtitle")}
          </p>

          <Card className="mt-6">
            <CardContent className="space-y-4 p-5">
              <Field label={t("auth.username")}>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    className="ps-9"
                    placeholder={t("auth.usernamePlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submit()}
                  />
                </div>
              </Field>

              <Field label={t("auth.password")}>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    dir="ltr"
                    className="ps-9 text-start"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void submit()}
                  />
                </div>
              </Field>

              <Button
                className="w-full"
                disabled={busy}
                onClick={() => void submit()}
              >
                {busy ? t("common.loading") : t("auth.submit")}
              </Button>

              {appMode === "demo" ? (
                <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      {t("auth.demoHint")} · 123456
                    </p>
                    <Badge variant="warning">{t("mode.demo")}</Badge>
                  </div>
                  <div className="grid gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.username}
                        onClick={() => void submit(acc.username, "123456")}
                        className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-xs transition-colors hover:border-primary"
                      >
                        <span className="font-medium">{t(acc.labelKey)}</span>
                        <span className="num text-muted-foreground">
                          {acc.username}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
