import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Database, Info, Palette, RotateCcw } from "lucide-react";
import { siteConfig, setBrandColor } from "@/config/site.config";
import { appMode } from "@/lib/supabase";
import { store } from "@/data/store";
import { applyDirection } from "@/i18n";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const PROFILE_KEY = "realty-office-profile";
const BRAND_KEY = "realty-brand-color";

const BRAND_PRESETS = [
  { label: "أزرق", value: "217 91% 45%" },
  { label: "أخضر", value: "158 64% 36%" },
  { label: "كحلي", value: "222 47% 30%" },
  { label: "ذهبي", value: "38 92% 45%" },
  { label: "بنفسجي", value: "262 83% 55%" },
  { label: "أحمر", value: "0 72% 45%" },
];

interface OfficeProfile {
  name: string;
  city: string;
  phone: string;
  email: string;
}

function loadProfile(): OfficeProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as OfficeProfile;
  } catch {
    /* ignore */
  }
  return {
    name: siteConfig.name,
    city: siteConfig.cityAr,
    phone: siteConfig.phone,
    email: siteConfig.email,
  };
}

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<OfficeProfile>(loadProfile);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(BRAND_KEY);
    if (saved) setBrandColor(saved);
  }, []);

  function saveProfile() {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    toast.success(t("settings.savedLocal"));
  }

  function pickBrand(color: string) {
    localStorage.setItem(BRAND_KEY, color);
    setBrandColor(color);
  }

  return (
    <>
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.officeProfile")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("settings.officeName")}>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </Field>
              <Field label={t("settings.city")}>
                <Input
                  value={profile.city}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                />
              </Field>
              <Field label={t("settings.contactPhone")}>
                <Input
                  dir="ltr"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </Field>
              <Field label={t("settings.contactEmail")}>
                <Input
                  dir="ltr"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.savedLocal")} — لتغيير الاسم في كل النظام عدّل{" "}
              <code className="rounded bg-secondary px-1">src/config/site.config.ts</code>
            </p>
            <Button onClick={saveProfile}>{t("common.save")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("settings.appearance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label={t("settings.language")}>
              <div className="flex gap-2">
                {(["ar", "en"] as const).map((lang) => (
                  <Button
                    key={lang}
                    variant={i18n.language?.startsWith(lang) ? "default" : "outline"}
                    onClick={() => {
                      applyDirection(lang);
                      void i18n.changeLanguage(lang);
                    }}
                  >
                    {lang === "ar" ? t("settings.arabic") : t("settings.english")}
                  </Button>
                ))}
              </div>
            </Field>

            <Field label={t("settings.brandColor")}>
              <div className="flex flex-wrap gap-2">
                {BRAND_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => pickBrand(preset.value)}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary"
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ background: `hsl(${preset.value})` }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              {t("settings.connection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
              <span className="text-muted-foreground">{t("settings.mode")}</span>
              <Badge variant={appMode === "live" ? "success" : "warning"}>
                {appMode === "live" ? t("settings.liveMode") : t("settings.demoMode")}
              </Badge>
            </div>
            {appMode === "demo" ? (
              <p className="text-xs text-muted-foreground">
                {t("settings.notConnected")} — راجع ملف{" "}
                <code className="rounded bg-secondary px-1">docs/SETUP_SUPABASE_AR.md</code>
              </p>
            ) : null}
            <div className="pt-2">
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setConfirmReset(true)}
              >
                <RotateCcw />
                {t("settings.resetDemo")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              {t("settings.aboutSystem")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{siteConfig.name}</span>
              <span className="num font-medium">v{siteConfig.version}</span>
            </div>
            <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>React 19 + TypeScript + Vite</li>
              <li>Tailwind CSS v4 + shadcn/ui style components</li>
              <li>Supabase (PostgreSQL + Auth + Row Level Security)</li>
              <li>React Hook Form + Zod</li>
              <li>react-i18next (عربي / English)</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t("settings.resetDemo")}
        description={t("settings.resetDemoConfirm")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onConfirm={() => {
          store.reset();
          toast.success(t("common.saved"));
          window.location.reload();
        }}
      />
    </>
  );
}
