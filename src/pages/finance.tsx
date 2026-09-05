import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Transaction } from "@/types";
import { fetchAll, transactionsRepo } from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/auth/auth-context";
import { downloadCSV, toCSV } from "@/lib/analytics";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  TX_KINDS,
  badgeVariant,
  label,
  options,
} from "@/lib/labels";
import { formatDate, formatMoney, formatNumber, todayISO } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/input";
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
  kind: z.enum(TX_KINDS as [string, ...string[]]),
  category: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().nullable(),
  tx_date: z.string().min(4),
  contract_id: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

const currentMonth = new Date().toISOString().slice(0, 7);

export function FinancePage() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { data, loading, refetch } = useAsync(() => fetchAll(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [kindFilter, setKindFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const all = data?.transactions ?? [];

  const months = useMemo(
    () =>
      [...new Set(all.map((tx) => String(tx.tx_date ?? "").slice(0, 7)))]
        .filter(Boolean)
        .sort()
        .reverse(),
    [all],
  );

  const rows = useMemo(
    () =>
      all.filter((tx) => {
        if (kindFilter !== "all" && tx.kind !== kindFilter) return false;
        if (categoryFilter !== "all" && tx.category !== categoryFilter)
          return false;
        if (monthFilter !== "all" && String(tx.tx_date).slice(0, 7) !== monthFilter)
          return false;
        return true;
      }),
    [all, kindFilter, categoryFilter, monthFilter],
  );

  const monthRows = all.filter(
    (tx) => String(tx.tx_date ?? "").slice(0, 7) === currentMonth,
  );
  const sum = (list: Transaction[], kind: string) =>
    list.filter((tx) => tx.kind === kind).reduce((s, tx) => s + Number(tx.amount || 0), 0);

  const stats = {
    monthIncome: sum(monthRows, "income"),
    monthExpense: sum(monthRows, "expense"),
    income: sum(all, "income"),
    expense: sum(all, "expense"),
  };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as never });

  const kind = watch("kind");

  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? { ...editing }
        : {
            kind: "expense",
            category: "office_rent",
            amount: 0,
            description: "",
            tx_date: todayISO(),
            contract_id: null,
          },
    );
  }, [open, editing, reset]);

  const categoryOptions =
    kind === "income"
      ? options(t, "category", INCOME_CATEGORIES)
      : options(t, "category", EXPENSE_CATEGORIES);

  const contractOptions = (data?.contracts ?? []).map((c) => ({
    value: c.id,
    label: `${c.contract_no} — ${formatMoney(c.total_amount)}`,
  }));

  async function onSubmit(values: FormValues) {
    try {
      const payload = {
        ...values,
        description: values.description || null,
        contract_id: values.contract_id || null,
        created_by: profile?.id ?? null,
      };
      if (editing)
        await transactionsRepo.update(editing.id, payload as Partial<Transaction>);
      else await transactionsRepo.create(payload as never);
      toast.success(t("common.saved"));
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function remove() {
    if (!deleting) return;
    await transactionsRepo.remove(deleting.id);
    toast.success(t("common.deleted"));
    setDeleting(null);
    await refetch();
  }

  function exportCSV() {
    downloadCSV(
      "finance.csv",
      toCSV(
        rows.map((tx) => ({
          date: tx.tx_date,
          kind: tx.kind === "income" ? t("finance.income") : t("finance.expense"),
          category: label(t, "category", tx.category),
          amount: tx.amount,
          description: tx.description ?? "",
        })),
        ["date", "kind", "category", "amount", "description"],
      ),
    );
  }

  return (
    <>
      <PageHeader
        title={t("finance.title")}
        subtitle={t("finance.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportCSV} disabled={!rows.length}>
              <Download />
              {t("common.export")}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus />
              {t("finance.addNew")}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={ArrowUpCircle}
          label={`${t("finance.income")} — ${t("finance.thisMonth")}`}
          value={formatMoney(stats.monthIncome)}
          tone="success"
        />
        <StatCard
          icon={ArrowDownCircle}
          label={`${t("finance.expense")} — ${t("finance.thisMonth")}`}
          value={formatMoney(stats.monthExpense)}
          tone="danger"
        />
        <StatCard
          icon={TrendingUp}
          label={`${t("finance.income")} — ${t("finance.allTime")}`}
          value={formatMoney(stats.income)}
        />
        <StatCard
          icon={TrendingDown}
          label={`${t("finance.expense")} — ${t("finance.allTime")}`}
          value={formatMoney(stats.expense)}
          tone="warning"
        />
        <StatCard
          icon={Wallet}
          label={t("finance.net")}
          value={formatMoney(stats.income - stats.expense)}
          tone={stats.income - stats.expense >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <SimpleSelect
          value={kindFilter}
          onValueChange={setKindFilter}
          options={[
            { value: "all", label: `${t("finance.kind")}: ${t("common.all")}` },
            ...options(t, "finance", TX_KINDS),
          ]}
        />
        <SimpleSelect
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          options={[
            { value: "all", label: `${t("finance.category")}: ${t("common.all")}` },
            ...options(t, "category", [
              ...INCOME_CATEGORIES,
              ...EXPENSE_CATEGORIES,
            ]),
          ]}
        />
        <SimpleSelect
          value={monthFilter}
          onValueChange={setMonthFilter}
          options={[
            { value: "all", label: `${t("common.date")}: ${t("common.all")}` },
            ...months.map((m) => ({ value: m, label: m })),
          ]}
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.noData")} description={t("finance.subtitle")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("common.date")}</TH>
                <TH>{t("finance.kind")}</TH>
                <TH>{t("finance.category")}</TH>
                <TH>{t("finance.description")}</TH>
                <TH>{t("finance.contract")}</TH>
                <TH>{t("common.amount")}</TH>
                <TH className="w-16">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((tx) => (
                <TR key={tx.id}>
                  <TD className="num text-sm">{formatDate(tx.tx_date)}</TD>
                  <TD>
                    <Badge variant={badgeVariant("txKind", tx.kind)}>
                      {tx.kind === "income"
                        ? t("finance.income")
                        : t("finance.expense")}
                    </Badge>
                  </TD>
                  <TD className="text-sm">{label(t, "category", tx.category)}</TD>
                  <TD className="max-w-64 truncate text-sm text-muted-foreground">
                    {tx.description ?? "—"}
                  </TD>
                  <TD className="num text-xs text-muted-foreground">
                    {tx.contract_id
                      ? (data?.contracts.find((c) => c.id === tx.contract_id)
                          ?.contract_no ?? "—")
                      : t("finance.notLinked")}
                  </TD>
                  <TD
                    className={`num text-sm font-semibold ${
                      tx.kind === "income" ? "text-success" : "text-destructive"
                    }`}
                  >
                    {tx.kind === "income" ? "+" : "−"}
                    {formatMoney(tx.amount)}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(tx);
                          setOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => setDeleting(tx)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
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
              {editing ? t("common.edit") : t("finance.addNew")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("finance.kind")}>
                <SimpleSelect
                  value={watch("kind")}
                  onValueChange={(v) => {
                    setValue("kind", v as never);
                    setValue(
                      "category",
                      v === "income" ? "commission" : "office_rent",
                    );
                  }}
                  options={options(t, "finance", TX_KINDS)}
                />
              </Field>
              <Field label={t("finance.category")} error={errors.category?.message}>
                <SimpleSelect
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v)}
                  options={categoryOptions}
                />
              </Field>
              <Field label={t("common.amount")} error={errors.amount?.message}>
                <Input type="number" dir="ltr" {...register("amount")} />
              </Field>
              <Field label={t("common.date")} error={errors.tx_date?.message}>
                <Input type="date" dir="ltr" {...register("tx_date")} />
              </Field>
              <Field label={t("finance.contract")} className="sm:col-span-2">
                <SimpleSelect
                  value={watch("contract_id") ?? "none"}
                  onValueChange={(v) =>
                    setValue("contract_id", v === "none" ? null : v)
                  }
                  options={[
                    { value: "none", label: t("finance.notLinked") },
                    ...contractOptions,
                  ]}
                />
              </Field>
              <Field label={t("finance.description")} className="sm:col-span-2">
                <Input {...register("description")} />
              </Field>
            </div>
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
        description={deleting?.description ?? undefined}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
      />
    </>
  );
}
