import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import type { Lead } from "@/types";
import { fetchAll, leadsRepo } from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/auth/auth-context";
import { scopeRows } from "@/lib/permissions";
import { STAGES, badgeVariant, label, options } from "@/lib/labels";
import { formatDate, formatNumber, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, TableSkeleton } from "@/components/ui/feedback";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const schema = z.object({
  client_id: z.string().min(1),
  property_id: z.string().nullable(),
  stage: z.enum(STAGES as [string, ...string[]]),
  next_followup_at: z.string().nullable(),
  notes: z.string().nullable(),
  owner_id: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const STAGE_ORDER = STAGES;

export function LeadsPage() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { data, loading, refetch } = useAsync(() => fetchAll(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState("all");

  const scoped = useMemo(
    () => scopeRows(data?.leads ?? [], profile, isAdmin, "owner_id"),
    [data, profile, isAdmin],
  );

  const rows = useMemo(() => {
    const list =
      stageFilter === "all"
        ? scoped
        : scoped.filter((l) => l.stage === stageFilter);
    return [...list].sort((a, b) =>
      String(a.next_followup_at ?? "9999").localeCompare(
        String(b.next_followup_at ?? "9999"),
      ),
    );
  }, [scoped, stageFilter]);

  const clientName = (id: string) =>
    data?.clients.find((c) => c.id === id)?.full_name ?? "—";
  const propertyTitle = (id: string | null) =>
    data?.properties.find((p) => p.id === id)?.title ?? "—";
  const staffName = (id: string | null) =>
    data?.profiles.find((p) => p.id === id)?.full_name ?? "—";

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
            client_id: editing.client_id,
            property_id: editing.property_id,
            stage: editing.stage,
            next_followup_at: editing.next_followup_at,
            notes: editing.notes,
            owner_id: editing.owner_id,
          }
        : {
            client_id: "",
            property_id: null,
            stage: "new",
            next_followup_at: todayISO(),
            notes: "",
            owner_id: profile?.id ?? null,
          },
    );
  }, [open, editing, profile?.id, reset]);

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        notes: values.notes || null,
        property_id: values.property_id || null,
        owner_id: values.owner_id || profile?.id || null,
        updated_at: new Date().toISOString(),
      };
      if (editing) await leadsRepo.update(editing.id, payload as Partial<Lead>);
      else await leadsRepo.create(payload as never);
      toast.success(t("common.saved"));
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function advance(lead: Lead) {
    const idx = STAGE_ORDER.indexOf(lead.stage);
    const next = STAGE_ORDER[Math.min(idx + 1, STAGE_ORDER.length - 1)];
    if (next === lead.stage) return;
    await leadsRepo.update(lead.id, {
      stage: next,
      updated_at: new Date().toISOString(),
    } as Partial<Lead>);
    toast.success(`${t("lead.stage")}: ${label(t, "stage", next)}`);
    await refetch();
  }

  async function remove() {
    if (!deleting) return;
    await leadsRepo.remove(deleting.id);
    toast.success(t("common.deleted"));
    setDeleting(null);
    await refetch();
  }

  const today = todayISO();
  const dueInfo = (date: string | null) => {
    if (!date) return { tone: "muted" as const, text: "—" };
    if (date < today) return { tone: "danger" as const, text: t("lead.overdue") };
    if (date === today) return { tone: "warning" as const, text: t("lead.today") };
    return { tone: "muted" as const, text: t("lead.upcoming") };
  };

  const clientOptions = (data?.clients ?? []).map((c) => ({
    value: c.id,
    label: `${c.full_name} · ${c.phone}`,
  }));
  const propertyOptions = (data?.properties ?? []).map((p) => ({
    value: p.id,
    label: `${p.ref_code} — ${p.title}`,
  }));
  const staffOptions = (data?.profiles ?? [])
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: p.full_name }));

  return (
    <>
      <PageHeader
        title={t("lead.title")}
        subtitle={t("lead.subtitle")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus />
            {t("lead.addNew")}
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        <SimpleSelect
          value={stageFilter}
          onValueChange={setStageFilter}
          options={[
            { value: "all", label: `${t("lead.stage")}: ${t("common.all")}` },
            ...options(t, "stage", STAGES),
          ]}
        />
        <div className="col-span-3 grid grid-cols-3 gap-2">
          {(["overdue", "today", "upcoming"] as const).map((key) => {
            const count = scoped.filter((l) => {
              const d = l.next_followup_at;
              if (!d) return false;
              return key === "overdue"
                ? d < today
                : key === "today"
                  ? d === today
                  : d > today;
            }).length;
            return (
              <div
                key={key}
                className="rounded-lg bg-secondary/60 px-3 py-2 text-center"
              >
                <p className="num text-lg font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{t(`lead.${key}`)}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.noData")} description={t("lead.subtitle")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("lead.client")}</TH>
                <TH>{t("lead.property")}</TH>
                <TH>{t("lead.stage")}</TH>
                <TH>{t("lead.nextFollowup")}</TH>
                <TH>{t("lead.owner")}</TH>
                <TH>{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((l) => {
                const due = dueInfo(l.next_followup_at);
                return (
                  <TR key={l.id}>
                    <TD className="text-sm font-medium">{clientName(l.client_id)}</TD>
                    <TD className="max-w-64 truncate text-sm text-muted-foreground">
                      {propertyTitle(l.property_id)}
                    </TD>
                    <TD>
                      <Badge variant={badgeVariant("stage", l.stage)}>
                        {label(t, "stage", l.stage)}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="num text-sm">{formatDate(l.next_followup_at)}</span>
                        <Badge variant={due.tone}>{due.text}</Badge>
                      </div>
                    </TD>
                    <TD className="text-sm text-muted-foreground">
                      {staffName(l.owner_id)}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void advance(l)}
                          disabled={l.stage === "won" || l.stage === "lost"}
                          title={t("lead.moveStage")}
                        >
                          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(l);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => setDeleting(l)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {formatNumber(rows.length)} {t("common.results")}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("lead.edit") : t("lead.addNew")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label={t("lead.client")} error={errors.client_id?.message}>
              <SimpleSelect
                value={watch("client_id") || "none"}
                onValueChange={(v) => setValue("client_id", v)}
                options={
                  clientOptions.length
                    ? clientOptions
                    : [{ value: "none", label: t("common.noData") }]
                }
              />
            </Field>
            <Field label={t("lead.property")}>
              <SimpleSelect
                value={watch("property_id") ?? "none"}
                onValueChange={(v) =>
                  setValue("property_id", v === "none" ? null : v)
                }
                options={[
                  { value: "none", label: t("property.unassigned") },
                  ...propertyOptions,
                ]}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("lead.stage")}>
                <SimpleSelect
                  value={watch("stage")}
                  onValueChange={(v) => setValue("stage", v as never)}
                  options={options(t, "stage", STAGES)}
                />
              </Field>
              <Field label={t("lead.nextFollowup")}>
                <Input type="date" dir="ltr" {...register("next_followup_at")} />
              </Field>
              <Field label={t("lead.owner")}>
                <SimpleSelect
                  value={watch("owner_id") ?? "none"}
                  onValueChange={(v) =>
                    setValue("owner_id", v === "none" ? null : v)
                  }
                  options={[
                    { value: "none", label: t("property.unassigned") },
                    ...staffOptions,
                  ]}
                  disabled={!isAdmin}
                />
              </Field>
            </div>
            <Field label={t("common.notes")}>
              <Textarea rows={3} {...register("notes")} />
            </Field>
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
        description={deleting ? clientName(deleting.client_id) : undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
      />
    </>
  );
}
