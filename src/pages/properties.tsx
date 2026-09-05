import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Download,
  Eye,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Property, PropertyFilters } from "@/types";
import { fetchAll, propertiesRepo } from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { useAuth } from "@/auth/auth-context";
import { scopeRows } from "@/lib/permissions";
import { downloadCSV, toCSV } from "@/lib/analytics";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  PURPOSES,
  badgeVariant,
  label,
  options,
} from "@/lib/labels";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { EmptyState, TableSkeleton } from "@/components/ui/feedback";
import {
  Dialog,
  DialogContent,
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
import { PropertyFormDialog } from "./property-form";

const ALL = "all";

export function PropertiesPage() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { data, loading, refetch } = useAsync(() => fetchAll(), []);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [detail, setDetail] = useState<Property | null>(null);
  const [deleting, setDeleting] = useState<Property | null>(null);
  const [filters, setFilters] = useState<PropertyFilters>({
    search: "",
    purpose: ALL,
    type: ALL,
    status: ALL,
    district: ALL,
  });

  const scoped = useMemo(
    () => scopeRows(data?.properties ?? [], profile, isAdmin, "agent_id"),
    [data, profile, isAdmin],
  );

  const districts = useMemo(
    () => [...new Set(scoped.map((p) => p.district).filter(Boolean))].sort(),
    [scoped],
  );

  const rows = useMemo(() => {
    const q = (filters.search ?? "").trim().toLowerCase();
    return scoped.filter((p) => {
      if (q) {
        const hay = `${p.ref_code} ${p.title} ${p.district} ${p.governorate} ${p.owner_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.purpose && filters.purpose !== ALL && p.purpose !== filters.purpose)
        return false;
      if (filters.type && filters.type !== ALL && p.type !== filters.type)
        return false;
      if (filters.status && filters.status !== ALL && p.status !== filters.status)
        return false;
      if (filters.district && filters.district !== ALL && p.district !== filters.district)
        return false;
      if (filters.minPrice && p.price < filters.minPrice) return false;
      if (filters.maxPrice && p.price > filters.maxPrice) return false;
      return true;
    });
  }, [scoped, filters]);

  const agentName = (id: string | null) =>
    data?.profiles.find((p) => p.id === id)?.full_name ?? "—";

  async function remove() {
    if (!deleting) return;
    try {
      await propertiesRepo.remove(deleting.id);
      toast.success(t("common.deleted"));
      setDeleting(null);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
    }
  }

  function exportCSV() {
    const csv = toCSV(
      rows.map((p) => ({
        ref: p.ref_code,
        title: p.title,
        purpose: label(t, "purpose", p.purpose),
        type: label(t, "type", p.type),
        status: label(t, "propertyStatus", p.status),
        district: p.district,
        governorate: p.governorate,
        area: p.area_sqm ?? "",
        price: p.price,
        owner: p.owner_name ?? "",
        owner_phone: p.owner_phone ?? "",
        agent: agentName(p.agent_id),
        created: p.created_at?.slice(0, 10) ?? "",
      })),
      [
        "ref",
        "title",
        "purpose",
        "type",
        "status",
        "district",
        "governorate",
        "area",
        "price",
        "owner",
        "owner_phone",
        "agent",
        "created",
      ],
    );
    downloadCSV("properties.csv", csv);
  }

  const activeFilters =
    (filters.search ? 1 : 0) +
    (filters.purpose !== ALL ? 1 : 0) +
    (filters.type !== ALL ? 1 : 0) +
    (filters.status !== ALL ? 1 : 0) +
    (filters.district !== ALL ? 1 : 0);

  return (
    <>
      <PageHeader
        title={t("property.title")}
        subtitle={t("property.subtitle")}
        actions={
          <>
            <Button variant="outline" onClick={exportCSV} disabled={!rows.length}>
              <Download />
              {t("common.export")}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus />
              {t("property.addNew")}
            </Button>
          </>
        }
      />

      {/* شريط التصفية */}
      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t("common.search")}
            value={filters.search ?? ""}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value }))
            }
          />
        </div>
        <SimpleSelect
          value={filters.purpose ?? ALL}
          onValueChange={(v) => setFilters((f) => ({ ...f, purpose: v as never }))}
          options={[{ value: ALL, label: `${t("property.purpose")}: ${t("common.all")}` }, ...options(t, "purpose", PURPOSES)]}
        />
        <SimpleSelect
          value={filters.type ?? ALL}
          onValueChange={(v) => setFilters((f) => ({ ...f, type: v as never }))}
          options={[{ value: ALL, label: `${t("property.type")}: ${t("common.all")}` }, ...options(t, "type", PROPERTY_TYPES)]}
        />
        <SimpleSelect
          value={filters.status ?? ALL}
          onValueChange={(v) => setFilters((f) => ({ ...f, status: v as never }))}
          options={[{ value: ALL, label: `${t("common.status")}: ${t("common.all")}` }, ...options(t, "propertyStatus", PROPERTY_STATUSES)]}
        />
        <SimpleSelect
          value={filters.district ?? ALL}
          onValueChange={(v) => setFilters((f) => ({ ...f, district: v }))}
          options={[
            { value: ALL, label: `${t("property.district")}: ${t("common.all")}` },
            ...districts.map((d) => ({ value: d, label: d })),
          ]}
        />
        <div className="flex items-center gap-2">
          <Input
            type="number"
            dir="ltr"
            placeholder="min price"
            className="h-9"
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                minPrice: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
          <Input
            type="number"
            dir="ltr"
            placeholder="max price"
            className="h-9"
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
          />
          {activeFilters > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setFilters({
                  search: "",
                  purpose: ALL,
                  type: ALL,
                  status: ALL,
                  district: ALL,
                })
              }
              title={t("common.reset")}
            >
              <X />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <TableSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            title={t("common.noData")}
            description={t("property.subtitle")}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus />
                {t("property.addNew")}
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>{t("property.ref")}</TH>
                <TH>{t("property.propertyName")}</TH>
                <TH>{t("property.purpose")}</TH>
                <TH>{t("property.type")}</TH>
                <TH>{t("property.district")}</TH>
                <TH>{t("property.area")}</TH>
                <TH>{t("property.price")}</TH>
                <TH>{t("common.status")}</TH>
                <TH>{t("property.agent")}</TH>
                <TH className="w-16">{t("common.actions")}</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((p) => (
                <TR key={p.id}>
                  <TD className="num text-xs text-muted-foreground">
                    {p.ref_code}
                  </TD>
                  <TD>
                    <button
                      className="cursor-pointer text-start text-sm font-medium hover:text-primary"
                      onClick={() => setDetail(p)}
                    >
                      {p.featured ? "★ " : ""}
                      {p.title}
                    </button>
                  </TD>
                  <TD>
                    <Badge variant={badgeVariant("purpose", p.purpose)}>
                      {label(t, "purpose", p.purpose)}
                    </Badge>
                  </TD>
                  <TD className="text-sm">{label(t, "type", p.type)}</TD>
                  <TD className="text-sm">{p.district}</TD>
                  <TD className="num text-sm">
                    {p.area_sqm ? formatNumber(p.area_sqm) : "—"}
                  </TD>
                  <TD className="num text-sm font-medium">
                    {formatMoney(p.price)}
                    {p.purpose === "rent" ? (
                      <span className="text-xs text-muted-foreground">
                        /{p.rent_period === "yearly" ? "سنة" : "شهر"}
                      </span>
                    ) : null}
                  </TD>
                  <TD>
                    <Badge variant={badgeVariant("propertyStatus", p.status)}>
                      {label(t, "propertyStatus", p.status)}
                    </Badge>
                  </TD>
                  <TD className="text-sm text-muted-foreground">
                    {agentName(p.agent_id)}
                  </TD>
                  <TD>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setDetail(p)}>
                          <Eye />
                          {t("common.details")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setDeleting(p)}
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
        <span>
          {formatNumber(rows.length)} {t("common.results")}
        </span>
        {!isAdmin ? <span> · {t("staff.adminNote")}</span> : null}
      </p>

      <PropertyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        property={editing}
        profiles={data?.profiles ?? []}
        onSaved={() => void refetch()}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={t("property.deleteTitle")}
        description={deleting?.title}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
      />

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={badgeVariant("purpose", detail.purpose)}>
                  {label(t, "purpose", detail.purpose)}
                </Badge>
                <Badge variant="muted">{label(t, "type", detail.type)}</Badge>
                <Badge variant={badgeVariant("propertyStatus", detail.status)}>
                  {label(t, "propertyStatus", detail.status)}
                </Badge>
                {detail.finishing ? (
                  <Badge variant="outline">
                    {label(t, "finishing", detail.finishing)}
                  </Badge>
                ) : null}
              </div>

              <p className="text-2xl font-bold text-primary num">
                {formatMoney(detail.price)}
                {detail.purpose === "rent" ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{detail.rent_period === "yearly" ? "سنة" : "شهر"}
                  </span>
                ) : null}
              </p>

              <dl className="grid gap-3 sm:grid-cols-3">
                {[
                  [t("property.ref"), detail.ref_code],
                  [t("property.area"), detail.area_sqm ? `${formatNumber(detail.area_sqm)} م²` : "—"],
                  [t("property.bedrooms"), detail.bedrooms ?? "—"],
                  [t("property.bathrooms"), detail.bathrooms ?? "—"],
                  [t("property.floor"), detail.floor_no ?? "—"],
                  [t("property.totalFloors"), detail.total_floors ?? "—"],
                  [t("property.governorate"), detail.governorate],
                  [t("property.district"), detail.district],
                  [t("property.address"), detail.address ?? "—"],
                  [t("property.ownerName"), detail.owner_name ?? "—"],
                  [t("property.ownerPhone"), detail.owner_phone ?? "—"],
                  [t("property.agent"), agentName(detail.agent_id)],
                  [t("common.created"), formatDate(detail.created_at)],
                  [t("common.updatedAt"), formatDate(detail.updated_at)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-secondary/50 p-2.5">
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="num mt-0.5 font-medium">{v}</dd>
                  </div>
                ))}
              </dl>

              {detail.description ? (
                <p className="rounded-lg border border-border p-3 text-muted-foreground">
                  {detail.description}
                </p>
              ) : null}
              {detail.notes ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  {detail.notes}
                </p>
              ) : null}

              <Button
                onClick={() => {
                  setEditing(detail);
                  setDetail(null);
                  setFormOpen(true);
                }}
              >
                <Pencil />
                {t("common.edit")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
