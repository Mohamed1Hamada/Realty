import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CheckCircle2, Download, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import type { Contract } from "@/types";
import {
  contractsRepo,
  fetchAll,
  propertiesRepo,
  transactionsRepo,
} from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/auth/auth-context";
import { scopeRows } from "@/lib/permissions";
import { downloadCSV, toCSV } from "@/lib/analytics";
import {
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  badgeVariant,
  label,
  options,
} from "@/lib/labels";
import { formatDate, formatMoney, formatNumber, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileText, TrendingUp, Wallet } from "lucide-react";

const schema = z.object({
  contract_no: z.string().min(3),
  type: z.enum(CONTRACT_TYPES as [string, ...string[]]),
  property_id: z.string().min(1),
  client_id: z.string().min(1),
  total_amount: z.coerce.number().positive(),
  commission_rate: z.coerce.number().min(0).max(100),
  paid_amount: z.coerce.number().min(0),
  status: z.enum(CONTRACT_STATUSES as [string, ...string[]]),
  sign_date: z.string().min(4),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  agent_id: z.string().nullable(),
  notes: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function ContractsPage() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { data, loading, refetch } = useAsync(() => fetchAll(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [deleting, setDeleting] = useState<Contract | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const scoped = useMemo(
    () => scopeRows(data?.contracts ?? [], profile, isAdmin, "agent_id"),
    [data, profile, isAdmin],
  );

  const rows = useMemo(
    () =>
      statusFilter === "all"
        ? scoped
        : scoped.filter((c) => c.status === statusFilter),
    [scoped, statusFilter],
  );

  const totals = useMemo(
    () => ({
      commission: rows.reduce((s, c) => s + Number(c.commission_amount || 0), 0),
      paid: rows.reduce((s, c) => s + Number(c.paid_amount || 0), 0),
      count: rows.length,
    }),
    [rows],
  );

  const clientName = (id: string) =>
    data?.clients.find((c) => c.id === id)?.full_name ?? "—";
  const propertyTitle = (id: string) =>
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
        ? { ...editing }
        : {
            contract_no: `CNT-${Math.floor(2026000 + Math.random() * 999)}`,
            type: "sale",
            property_id: "",
            client_id: "",
            total_amount: 0,
            commission_rate: 1,
            paid_amount: 0,
            status: "draft",
            sign_date: todayISO(),
            start_date: null,
            end_date: null,
            agent_id: profile?.id ?? null,
            notes: "",
          },
    );
  }, [open, editing, profile?.id, reset]);

  const totalAmount = Number(watch("total_amount") || 0);
  const rate = Number(watch("commission_rate") || 0);
  const commission = Math.round((totalAmount * rate) / 100);

  async function onSubmit(values: FormValues) {
    const commission_amount = Math.round(
      (Number(values.total_amount) * Number(values.commission_rate)) / 100,
    );
    const payload = {
      ...values,
      commission_amount,
      notes: values.notes || null,
      agent_id: values.agent_id || profile?.id || null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
    };

    try {
      const saved = editing
        ? await contractsRepo.update(editing.id, payload as Partial<Contract>)
        : await contractsRepo.create(payload as never);

      // مزامنة العمولة المسددة مع دفتر الحسابات تلقائيًا
      const existing = (data?.transactions ?? []).find(
        (tx) => tx.contract_id === saved.id,
      );
      if (
        Number(values.paid_amount) > 0 &&
        values.status !== "cancelled"
      ) {
        const txPayload = {
          kind: "income" as const,
          category:
            values.type === "rent"
              ? ("rent_collection" as const)
              : ("commission" as const),
          amount: Number(values.paid_amount),
          description: `${t("contract.commissionAmount")} — ${values.contract_no}`,
          tx_date: values.sign_date,
          contract_id: saved.id,
          created_by: profile?.id ?? null,
        };
        if (existing) await transactionsRepo.update(existing.id, txPayload);
        else await transactionsRepo.create(txPayload as never);
      } else if (existing) {
        await transactionsRepo.remove(existing.id);
      }

      // تحديث حالة العقار تلقائيًا لما العقد يخلص
      if (values.status === "completed") {
        await propertiesRepo.update(values.property_id, {
          status: values.type === "rent" ? "rented" : "sold",
        } as never);
      }

      toast.success(t("common.saved"));
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function markCompleted(c: Contract) {
    await contractsRepo.update(c.id, { status: "completed" } as Partial<Contract>);
    toast.success(t("contract.markCompleted"));
    await refetch();
  }

  async function remove() {
    if (!deleting) return;
    await contractsRepo.remove(deleting.id);
    toast.success(t("common.deleted"));
    setDeleting(null);
    await refetch();
  }

  function exportCSV() {
    downloadCSV(
      "contracts.csv",
      toCSV(
        rows.map((c) => ({
          contract_no: c.contract_no,
          type: label(t, "purpose", c.type),
          status: label(t, "contractStatus", c.status),
          property: propertyTitle(c.property_id),
          client: clientName(c.client_id),
          total_amount: c.total_amount,
          commission: c.commission_amount,
          paid: c.paid_amount,
          remaining: Number(c.commission_amount) - Number(c.paid_amount),
          sign_date: c.sign_date,
          agent: staffName(c.agent_id),
        })),
        [
          "contract_no",
          "type",
          "status",
          "property",
          "client",
          "total_amount",
          "commission",
          "paid",
          "remaining",
          "sign_date",
          "agent",
        ],
      ),
    );
  }

  const propertyOptions = (data?.properties ?? []).map((p) => ({
    value: p.id,
    label: `${p.ref_code} — ${p.title}`,
  }));
  const clientOptions = (data?.clients ?? []).map((c) => ({
    value: c.id,
    label: `${c.full_name} · ${c.phone}`,
  }));
  const staffOptions = (data?.profiles ?? [])
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: p.full_name }));

  return (
    <>
      <PageHeader
        title={t("contract.title")}
        subtitle={t("contract.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportCSV} disabled={!rows.length}>
              <Download />
              {t("common.export")}
            </Button>
            <Button variant="outline" onClick={() => window.print()} disabled={!rows.length}>
              <Printer />
              {t("common.print")}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus />
              {t("contract.addNew")}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={FileText}
          label={t("contract.title")}
          value={formatNumber(totals.count)}
          tone="muted"
        />
        <StatCard
          icon={TrendingUp}
          label={t("contract.commissionAmount")}
          value={formatMoney(totals.commission)}
        />
        <StatCard
          icon={Wallet}
          label={t("contract.paid")}
          value={formatMoney(totals.paid)}
          hint={`${t("contract.remaining")}: ${formatMoney(totals.commission - totals.paid)}`}
          tone="success"
        />
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        <SimpleSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "all", label: `${t("common.status")}: ${t("common.all")}` },
            ...options(t, "contractStatus", CONTRACT_STATUSES),
          ]}
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.noData")} description={t("contract.subtitle")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("contract.contractNo")}</TH>
                <TH>{t("contract.property")}</TH>
                <TH>{t("contract.client")}</TH>
                <TH>{t("contract.totalAmount")}</TH>
                <TH>{t("contract.commissionAmount")}</TH>
                <TH>{t("contract.paid")}</TH>
                <TH>{t("contract.agent")}</TH>
                <TH>{t("common.status")}</TH>
                <TH className="w-16">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD className="num text-sm font-medium">{c.contract_no}</TD>
                  <TD className="max-w-56 truncate text-sm">
                    {propertyTitle(c.property_id)}
                  </TD>
                  <TD className="text-sm">{clientName(c.client_id)}</TD>
                  <TD className="num text-sm">{formatMoney(c.total_amount)}</TD>
                  <TD className="num text-sm font-medium text-primary">
                    {formatMoney(c.commission_amount)}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({c.commission_rate}%)
                    </span>
                  </TD>
                  <TD className="num text-sm">
                    {formatMoney(c.paid_amount)}
                    {Number(c.paid_amount) < Number(c.commission_amount) ? (
                      <div className="text-xs text-destructive">
                        {t("contract.due")}:{" "}
                        {formatMoney(
                          Number(c.commission_amount) - Number(c.paid_amount),
                        )}
                      </div>
                    ) : null}
                  </TD>
                  <TD className="text-sm text-muted-foreground">
                    {staffName(c.agent_id)}
                  </TD>
                  <TD>
                    <Badge variant={badgeVariant("contractStatus", c.status)}>
                      {label(t, "contractStatus", c.status)}
                    </Badge>
                  </TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Pencil />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(c);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        {c.status !== "completed" && c.status !== "cancelled" ? (
                          <DropdownMenuItem onSelect={() => void markCompleted(c)}>
                            <CheckCircle2 />
                            {t("contract.markCompleted")}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setDeleting(c)}
                        >
                          <Trash2 />
                          {t("common.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("contract.edit") : t("contract.addNew")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("contract.contractNo")} error={errors.contract_no?.message}>
                <Input dir="ltr" {...register("contract_no")} />
              </Field>
              <Field label={t("contract.type")}>
                <SimpleSelect
                  value={watch("type")}
                  onValueChange={(v) => setValue("type", v as never)}
                  options={options(t, "purpose", CONTRACT_TYPES)}
                />
              </Field>
              <Field label={t("common.status")}>
                <SimpleSelect
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as never)}
                  options={options(t, "contractStatus", CONTRACT_STATUSES)}
                />
              </Field>
              <Field label={t("contract.property")} error={errors.property_id?.message}>
                <SimpleSelect
                  value={watch("property_id") || "none"}
                  onValueChange={(v) => setValue("property_id", v)}
                  options={
                    propertyOptions.length
                      ? propertyOptions
                      : [{ value: "none", label: t("common.noData") }]
                  }
                />
              </Field>
              <Field label={t("contract.client")} error={errors.client_id?.message}>
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
              <Field label={t("contract.agent")}>
                <SimpleSelect
                  value={watch("agent_id") ?? "none"}
                  onValueChange={(v) =>
                    setValue("agent_id", v === "none" ? null : v)
                  }
                  options={[
                    { value: "none", label: t("property.unassigned") },
                    ...staffOptions,
                  ]}
                  disabled={!isAdmin}
                />
              </Field>
              <Field label={t("contract.totalAmount")} error={errors.total_amount?.message}>
                <Input type="number" dir="ltr" {...register("total_amount")} />
              </Field>
              <Field label={t("contract.commissionRate")}>
                <Input type="number" step="0.25" dir="ltr" {...register("commission_rate")} />
              </Field>
              <Field label={t("contract.commissionAmount")}>
                <Input value={formatMoney(commission)} readOnly dir="ltr" />
              </Field>
              <Field label={t("contract.paid")}>
                <Input type="number" dir="ltr" {...register("paid_amount")} />
              </Field>
              <Field label={t("contract.signDate")} error={errors.sign_date?.message}>
                <Input type="date" dir="ltr" {...register("sign_date")} />
              </Field>
              {watch("type") === "rent" ? (
                <>
                  <Field label={t("contract.startDate")}>
                    <Input type="date" dir="ltr" {...register("start_date")} />
                  </Field>
                  <Field label={t("contract.endDate")}>
                    <Input type="date" dir="ltr" {...register("end_date")} />
                  </Field>
                </>
              ) : null}
            </div>
            <Field label={t("common.notes")}>
              <Textarea rows={2} {...register("notes")} />
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
        description={deleting?.contract_no}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
      />
    </>
  );
}
