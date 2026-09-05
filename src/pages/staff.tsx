import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Info, Pencil, Plus, Trash2 } from "lucide-react";
import type { Profile } from "@/types";
import { fetchAll, profilesRepo } from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/auth/auth-context";
import { ROLES, badgeVariant, label, options } from "@/lib/labels";
import { formatMoney, formatNumber, initials, usernameOf } from "@/lib/utils";
import { appMode, supabase } from "@/lib/supabase";
import { toAuthEmail } from "@/auth/auth-context";
import { siteConfig } from "@/config/site.config";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TableSkeleton, EmptyState } from "@/components/ui/feedback";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const isDemo = appMode === "demo";

const schema = z.object({
  full_name: z.string().min(3),
  username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9_.-]+$/i, "حروف إنجليزية وأرقام و _ . - بس"),
  phone: z.string().nullable(),
  role: z.enum(ROLES as [string, ...string[]]),
  commission_rate: z.coerce.number().min(0).max(100),
  is_active: z.boolean(),
  password: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function StaffPage() {
  const { t } = useTranslation();
  const { profile: me } = useAuth();
  const { data, loading, refetch } = useAsync(() => fetchAll(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);

  const profiles = data?.profiles ?? [];

  const statsByStaff = useMemo(() => {
    const map = new Map<string, { deals: number; commission: number }>();
    (data?.contracts ?? []).forEach((c) => {
      if (!c.agent_id) return;
      const cur = map.get(c.agent_id) ?? { deals: 0, commission: 0 };
      map.set(c.agent_id, {
        deals: cur.deals + (c.status === "cancelled" ? 0 : 1),
        commission:
          cur.commission +
          (c.status === "cancelled" ? 0 : Number(c.commission_amount || 0)),
      });
    });
    return map;
  }, [data]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as never });

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? {
            full_name: editing.full_name,
            username: usernameOf(editing.email),
            phone: editing.phone ?? "",
            role: editing.role,
            commission_rate: editing.commission_rate,
            is_active: editing.is_active,
            password: "",
          }
        : {
            full_name: "",
            username: "",
            phone: "",
            role: "staff",
            commission_rate: 1,
            is_active: true,
            password: "",
          },
    );
  }, [open, editing, reset]);

  async function onSubmit(values: FormValues) {
    try {
      if (editing) {
        // تعديل بيانات موظف موجود — من غير ما نلمس حساب الدخول
        const rest = {
          full_name: values.full_name,
          phone: values.phone || null,
          role: values.role,
          commission_rate: values.commission_rate,
          is_active: values.is_active,
        };
        await profilesRepo.update(
          editing.id,
          (isDemo ? { ...rest, email: toAuthEmail(values.username) } : rest) as
            Partial<Profile>,
        );
      } else if (isDemo) {
        // وضع تجريبي — صف بيانات بس من غير Auth
        await profilesRepo.create({
          full_name: values.full_name,
          phone: values.phone || null,
          role: values.role,
          commission_rate: values.commission_rate,
          is_active: values.is_active,
          email: toAuthEmail(values.username),
          created_at: new Date().toISOString(),
        } as never);
      } else {
        // وضع حقيقي — ننشئ حساب الدخول عن طريق الوظيفة (Edge Function)
        if (!values.password || values.password.length < 6) {
          toast.error("كلمة المرور لازم تكون 6 حروف على الأقل");
          return;
        }
        const { data, error } = await supabase!.functions.invoke(
          "create-account",
          {
            body: {
              username: values.username,
              password: values.password,
              full_name: values.full_name,
              role: values.role,
              commission_rate: values.commission_rate,
              is_active: values.is_active,
              phone: values.phone || null,
            },
          },
        );
        if (error) throw new Error(error.message);
        if (data && typeof data === "object" && "error" in data)
          throw new Error(String((data as { error: string }).error));
      }
      toast.success(t("common.saved"));
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function remove() {
    if (!deleting) return;
    await profilesRepo.remove(deleting.id);
    toast.success(t("common.deleted"));
    setDeleting(null);
    await refetch();
  }

  return (
    <>
      <PageHeader
        title={t("staff.title")}
        subtitle={t("staff.subtitle")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus />
            {t("staff.addNew")}
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p>{t("staff.adminNote")}</p>
          <p>
            ضيف موظف بـ«إضافة موظف» — اكتب اليوزر نيم وكلمة مرور والصلاحية، والحساب
            بيتعمل تلقائيًا ويقدر يدخل على طول. الدخول بيوزر نيم فقط (البريد الداخلي{" "}
            <code className="rounded bg-secondary px-1">{`username@${siteConfig.authDomain}`}</code>{" "}
            مخفي ومش بيظهر لحد).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : profiles.length === 0 ? (
          <EmptyState title={t("common.noData")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("common.name")}</TH>
                <TH>{t("auth.username")}</TH>
                <TH>{t("common.phone")}</TH>
                <TH>{t("staff.role")}</TH>
                <TH>{t("staff.commissionRate")}</TH>
                <TH>{t("staff.dealsCount")}</TH>
                <TH>{t("staff.totalCommission")}</TH>
                <TH>{t("common.status")}</TH>
                <TH className="w-16">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {profiles.map((p) => {
                const stat = statsByStaff.get(p.id) ?? { deals: 0, commission: 0 };
                return (
                  <TR key={p.id}>
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {initials(p.full_name)}
                        </span>
                        <span className="text-sm font-medium">
                          {p.full_name}
                          {p.id === me?.id ? (
                            <span className="ms-1 text-xs text-muted-foreground">
                              (أنت)
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </TD>
                    <TD className="num text-sm text-muted-foreground">
                      {usernameOf(p.email)}
                    </TD>
                    <TD className="num text-sm">{p.phone ?? "—"}</TD>
                    <TD>
                      <Badge variant={badgeVariant("role", p.role)}>
                        {label(t, "role", p.role)}
                      </Badge>
                    </TD>
                    <TD className="num text-sm">{p.commission_rate}%</TD>
                    <TD className="num text-sm">{formatNumber(stat.deals)}</TD>
                    <TD className="num text-sm font-medium">
                      {formatMoney(stat.commission)}
                    </TD>
                    <TD>
                      <Badge variant={p.is_active ? "success" : "muted"}>
                        {p.is_active ? t("staff.active") : t("staff.inactive")}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(p);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        {p.id !== me?.id ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => setDeleting(p)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("staff.edit") : t("staff.addNew")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("common.name")} error={errors.full_name?.message}>
                <Input {...register("full_name")} />
              </Field>
              <Field label={t("auth.username")} error={errors.username?.message}>
                <Input
                  dir="ltr"
                  disabled={!!editing && !isDemo}
                  {...register("username")}
                />
              </Field>
              <Field label={t("common.phone")}>
                <Input dir="ltr" {...register("phone")} />
              </Field>
              <Field label={t("staff.role")}>
                <SimpleSelect
                  value={watch("role")}
                  onValueChange={(v) => setValue("role", v as never)}
                  options={options(t, "role", ROLES)}
                />
              </Field>
              <Field label={t("staff.commissionRate")}>
                <Input
                  type="number"
                  step="0.25"
                  dir="ltr"
                  {...register("commission_rate")}
                />
              </Field>
              {!editing && !isDemo ? (
                <Field label="كلمة المرور" error={errors.password?.message}>
                  <Input dir="ltr" type="text" {...register("password")} />
                </Field>
              ) : null}
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  {...register("is_active")}
                />
                {t("staff.active")}
              </label>
            </div>
            <p className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              {isDemo
                ? `كلمة المرور في الوضع التجريبي: 123456`
                : editing
                  ? "لتغيير كلمة مرور موظف موجود، غيّرها من Supabase → Authentication."
                  : `هيتعمل حساب دخول تلقائيًا بالبريد الداخلي ${watch("username") || "username"}@${siteConfig.authDomain} ويقدر الموظف يدخل على طول.`}
            </p>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("common.loading") : t("common.save")}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t("common.deleteConfirm")}
        description={deleting?.full_name}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
      />
    </>
  );
}
