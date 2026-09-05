import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import type { Client } from "@/types";
import { clientsRepo, fetchAll } from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/auth/auth-context";
import { scopeRows } from "@/lib/permissions";
import { downloadCSV, toCSV } from "@/lib/analytics";
import {
  CLIENT_KINDS,
  CLIENT_STATUSES,
  SOURCES,
  badgeVariant,
  label,
  options,
} from "@/lib/labels";
import { formatDate, formatMoney, formatNumber, initials } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const schema = z.object({
  full_name: z.string().min(3),
  phone: z.string().min(7),
  email: z.string().email().or(z.literal("")).nullable(),
  kind: z.enum(CLIENT_KINDS as [string, ...string[]]),
  status: z.enum(CLIENT_STATUSES as [string, ...string[]]),
  source: z.enum(SOURCES as [string, ...string[]]),
  budget: z.coerce.number().min(0).nullable(),
  assigned_to: z.string().nullable(),
  notes: z.string().nullable(),
});

type FormValues = z.infer<typeof schema>;

export function ClientsPage() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { data, loading, refetch } = useAsync(() => fetchAll(), []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const scoped = useMemo(
    () => scopeRows(data?.clients ?? [], profile, isAdmin, "assigned_to"),
    [data, profile, isAdmin],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((c) => {
      if (q && !`${c.full_name} ${c.phone}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [scoped, search, statusFilter]);

  const leadsByClient = useMemo(() => {
    const map = new Map<string, number>();
    (data?.leads ?? []).forEach((l) =>
      map.set(l.client_id, (map.get(l.client_id) ?? 0) + 1),
    );
    return map;
  }, [data]);

  const staffOptions = (data?.profiles ?? [])
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: p.full_name }));

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
        ? { ...editing, email: editing.email ?? "", budget: editing.budget, notes: editing.notes }
        : {
            full_name: "",
            phone: "",
            email: "",
            kind: "buyer",
            status: "lead",
            source: "facebook",
            budget: null,
            assigned_to: profile?.id ?? null,
            notes: "",
          },
    );
  }, [open, editing, profile?.id, reset]);

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      email: values.email || null,
      budget: values.budget || null,
      notes: values.notes || null,
      assigned_to: values.assigned_to || profile?.id || null,
    };
    try {
      if (editing) await clientsRepo.update(editing.id, payload as Partial<Client>);
      else await clientsRepo.create(payload as never);
      toast.success(t("common.saved"));
      setOpen(false);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await clientsRepo.remove(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  function exportCSV() {
    downloadCSV(
      "clients.csv",
      toCSV(
        rows.map((c) => ({
          name: c.full_name,
          phone: c.phone,
          kind: label(t, "clientKind", c.kind),
          status: label(t, "clientStatus", c.status),
          source: label(t, "source", c.source),
          budget: c.budget ?? "",
          leads: leadsByClient.get(c.id) ?? 0,
          created: c.created_at?.slice(0, 10) ?? "",
        })),
        ["name", "phone", "kind", "status", "source", "budget", "leads", "created"],
      ),
    );
  }

  return (
    <>
      <PageHeader
        title={t("client.title")}
        subtitle={t("client.subtitle")}
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
              {t("client.addNew")}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SimpleSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "all", label: `${t("common.status")}: ${t("common.all")}` },
            ...options(t, "clientStatus", CLIENT_STATUSES),
          ]}
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState title={t("common.noData")} description={t("client.subtitle")} />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("common.name")}</TH>
                <TH>{t("common.phone")}</TH>
                <TH>{t("client.kind")}</TH>
                <TH>{t("client.status")}</TH>
                <TH>{t("client.source")}</TH>
                <TH>{t("client.budget")}</TH>
                <TH>{t("client.leadsCount")}</TH>
                <TH>{t("common.created")}</TH>
                <TH className="w-16">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(c.full_name)}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{c.full_name}</p>
                        {c.email ? (
                          <p className="num text-xs text-muted-foreground">{c.email}</p>
                        ) : null}
                      </div>
                    </div>
                  </TD>
                  <TD>
                    <a
                      href={`tel:${c.phone}`}
                      className="num inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </a>
                  </TD>
                  <TD className="text-sm">{label(t, "clientKind", c.kind)}</TD>
                  <TD>
                    <Badge variant={badgeVariant("clientStatus", c.status)}>
                      {label(t, "clientStatus", c.status)}
                    </Badge>
                  </TD>
                  <TD className="text-sm text-muted-foreground">
                    {label(t, "source", c.source)}
                  </TD>
                  <TD className="num text-sm">
                    {c.budget ? formatMoney(c.budget) : "—"}
                  </TD>
                  <TD className="num text-sm">{leadsByClient.get(c.id) ?? 0}</TD>
                  <TD className="num text-xs text-muted-foreground">
                    {formatDate(c.created_at)}
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

      <p className="mt-3 text-xs text-muted-foreground">
        {formatNumber(rows.length)} {t("common.results")}
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t("client.edit") : t("client.addNew")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("common.name")} error={errors.full_name?.message}>
                <Input {...register("full_name")} />
              </Field>
              <Field label={t("common.phone")} error={errors.phone?.message}>
                <Input dir="ltr" {...register("phone")} placeholder="01xxxxxxxxx" />
              </Field>
              <Field label={t("common.email")} error={errors.email?.message}>
                <Input dir="ltr" type="email" {...register("email")} />
              </Field>
              <Field label={t("client.budget")}>
                <Input type="number" dir="ltr" {...register("budget")} />
              </Field>
              <Field label={t("client.kind")}>
                <SimpleSelect
                  value={watch("kind")}
                  onValueChange={(v) => setValue("kind", v as never)}
                  options={options(t, "clientKind", CLIENT_KINDS)}
                />
              </Field>
              <Field label={t("client.status")}>
                <SimpleSelect
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as never)}
                  options={options(t, "clientStatus", CLIENT_STATUSES)}
                />
              </Field>
              <Field label={t("client.source")}>
                <SimpleSelect
                  value={watch("source")}
                  onValueChange={(v) => setValue("source", v as never)}
                  options={options(t, "source", SOURCES)}
                />
              </Field>
              <Field label={t("client.assignedTo")}>
                <SimpleSelect
                  value={watch("assigned_to") ?? "none"}
                  onValueChange={(v) =>
                    setValue("assigned_to", v === "none" ? null : v)
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
        description={deleting?.full_name}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
      />
    </>
  );
}
