import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  FileText,
  MessageSquareText,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { fetchAll } from "@/data/service";
import { useAsync } from "@/hooks/use-async";
import { computeDashboard } from "@/lib/analytics";
import { formatMoney, formatNumber } from "@/lib/utils";
import { label } from "@/lib/labels";
import { useAuth } from "@/auth/auth-context";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { StatSkeleton } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PIE_COLORS = [
  "hsl(217 91% 45%)",
  "hsl(38 92% 50%)",
  "hsl(142 71% 36%)",
  "hsl(0 72% 51%)",
  "hsl(262 83% 58%)",
  "hsl(199 89% 48%)",
  "hsl(316 70% 50%)",
];

export function DashboardPage() {
  const { t } = useTranslation();
  const { profile, isAdmin } = useAuth();
  const { data, loading } = useAsync(() => fetchAll(), []);

  const stats = data ? computeDashboard(data) : null;

  const typeChartData =
    stats?.byType.map((row) => ({
      name: label(t, "type", row.key),
      value: row.value,
    })) ?? [];

  const monthlyData =
    stats?.monthly.map((row) => ({
      month: row.month.slice(5),
      [t("finance.income")]: row.income,
      [t("finance.expense")]: row.expense,
    })) ?? [];

  return (
    <>
      <PageHeader
        title={`${t("auth.welcome")}، ${profile?.full_name?.split(" ")[0] ?? ""}`}
        subtitle={t("dashboard.subtitle")}
      />

      {loading || !stats ? (
        <StatSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Building2}
              label={t("dashboard.totalProperties")}
              value={formatNumber(stats.totalProperties)}
              hint={`${formatNumber(stats.availableProperties)} ${t("dashboard.available")}`}
            />
            <StatCard
              icon={CheckCircle2}
              label={t("dashboard.soldRented")}
              value={formatNumber(stats.soldRented)}
              tone="success"
            />
            <StatCard
              icon={Users}
              label={t("dashboard.clients")}
              value={formatNumber(stats.totalClients)}
              hint={`${formatNumber(stats.activeLeads)} ${t("dashboard.activeLeads")}`}
              tone="muted"
            />
            <StatCard
              icon={FileText}
              label={t("dashboard.contracts")}
              value={formatNumber(stats.totalContracts)}
              tone="warning"
            />
          </div>

          {isAdmin ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={BadgeDollarSign}
                label={t("dashboard.commission")}
                value={formatMoney(stats.commissionEarned)}
                tone="primary"
              />
              <StatCard
                icon={TrendingUp}
                label={t("dashboard.income")}
                value={formatMoney(stats.incomeTotal)}
                tone="success"
              />
              <StatCard
                icon={TrendingDown}
                label={t("dashboard.expense")}
                value={formatMoney(stats.expenseTotal)}
                tone="danger"
              />
              <StatCard
                icon={TrendingUp}
                label={t("dashboard.net")}
                value={formatMoney(stats.netProfit)}
                tone={stats.netProfit >= 0 ? "success" : "danger"}
              />
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("dashboard.monthlyFlow")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 90%)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                        width={48}
                      />
                      <Tooltip
                        formatter={(v: number) => formatMoney(v)}
                        contentStyle={{ direction: "ltr", borderRadius: 10 }}
                      />
                      <Legend />
                      <Bar
                        dataKey={t("finance.income")}
                        fill="hsl(142 71% 36%)"
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar
                        dataKey={t("finance.expense")}
                        fill="hsl(0 72% 51%)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("dashboard.byType")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {typeChartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ direction: "ltr", borderRadius: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {typeChartData.slice(0, 6).map((row, i) => (
                    <Badge key={row.name} variant="outline">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      {row.name} ({row.value})
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {isAdmin ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.topAgents")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.topAgents.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("common.noData")}
                    </p>
                  ) : (
                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={stats.topAgents}
                          layout="vertical"
                          margin={{ left: 10, right: 24 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 90%)" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(v: number) => formatMoney(v)}
                            contentStyle={{ direction: "ltr", borderRadius: 10 }}
                          />
                          <Bar dataKey="value" fill="hsl(217 91% 45%)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            <Card className={isAdmin ? "" : "lg:col-span-2"}>
              <CardHeader>
                <CardTitle>{t("dashboard.recent")}</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.recentActivity.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("dashboard.noActivity")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {stats.recentActivity.map((row) => (
                      <li key={row.kind + row.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Badge variant="muted">
                            {row.kind === "property"
                              ? t("property.title")
                              : row.kind === "contract"
                                ? t("contract.title")
                                : t("client.title")}
                          </Badge>
                          <span className="truncate text-sm">{row.title}</span>
                        </div>
                        <span className="num shrink-0 text-xs text-muted-foreground">
                          {new Date(row.date).toLocaleDateString("ar-EG")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.saleRentSplit")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.sale")}</p>
                <p className="num text-2xl font-bold">{stats.byPurpose.sale}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("dashboard.rent")}</p>
                <p className="num text-2xl font-bold">{stats.byPurpose.rent}</p>
              </div>
              <div className="flex min-w-48 flex-1 items-center gap-1">
                <Badge variant="default">{t("dashboard.sale")}</Badge>
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${
                        stats.totalProperties
                          ? (stats.byPurpose.sale / stats.totalProperties) * 100
                          : 0
                      }%`,
                    }}
                  />
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: `${
                        stats.totalProperties
                          ? (stats.byPurpose.rent / stats.totalProperties) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <Badge variant="warning">{t("dashboard.rent")}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquareText className="h-4 w-4" />
                {formatNumber(stats.activeLeads)} {t("dashboard.activeLeads")}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
