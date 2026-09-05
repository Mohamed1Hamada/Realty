import { describe, expect, it } from "vitest";
import { computeDashboard, toCSV } from "@/lib/analytics";
import { demoData } from "@/data/demoData";

describe("computeDashboard على البيانات التجريبية", () => {
  const stats = computeDashboard(demoData);

  it("يعدّ العقارات والعملاء بشكل صحيح", () => {
    expect(stats.totalProperties).toBe(demoData.properties.length);
    expect(stats.totalProperties).toBe(25);
    expect(stats.totalClients).toBe(14);
    expect(stats.totalContracts).toBe(9);
  });

  it("يحسب المتاحة مقابل المُباعة/المُؤجرة", () => {
    const available = demoData.properties.filter(
      (p) => p.status === "available",
    ).length;
    const closed = demoData.properties.filter(
      (p) => p.status === "sold" || p.status === "rented",
    ).length;
    expect(stats.availableProperties).toBe(available);
    expect(stats.soldRented).toBe(closed);
    expect(available + closed).toBeLessThanOrEqual(stats.totalProperties);
  });

  it("يعدّ المتابعات المفتوحة فقط", () => {
    const open = demoData.leads.filter((l) =>
      ["new", "contacted", "viewing", "negotiation"].includes(l.stage),
    ).length;
    expect(stats.activeLeads).toBe(open);
  });

  it("صافي الربح = الإيرادات - المصروفات", () => {
    const income = demoData.transactions
      .filter((t) => t.kind === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = demoData.transactions
      .filter((t) => t.kind === "expense")
      .reduce((s, t) => s + t.amount, 0);
    expect(stats.incomeTotal).toBe(income);
    expect(stats.expenseTotal).toBe(expense);
    expect(stats.netProfit).toBe(income - expense);
  });

  it("يبني ٦ شهور في الرسم البياني", () => {
    expect(stats.monthly).toHaveLength(6);
    stats.monthly.forEach((m) => {
      expect(m.month).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  it("تقسيم بيع/إيجار يغطي كل العقارات", () => {
    expect(stats.byPurpose.sale + stats.byPurpose.rent).toBe(
      stats.totalProperties,
    );
  });

  it("لا يوجد نوع عقار بعدده صفر في التوزيع", () => {
    stats.byType.forEach((row) => expect(row.value).toBeGreaterThan(0));
  });
});

describe("toCSV", () => {
  it("يهرب القيم اللي فيها فاصلة لاتينية واقتباسات", () => {
    const csv = toCSV(
      [{ name: 'شقة, 180م', note: 'say "hi"' }],
      ["name", "note"],
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe("name,note");
    expect(lines[1]).toBe('"شقة, 180م","say ""hi"""');
  });

  it("الفاصلة العربية مش delimiter فمحتاجة اقتباس", () => {
    const csv = toCSV([{ name: "شقة، 180م" }], ["name"]);
    expect(csv.split("\n")[1]).toBe("شقة، 180م");
  });

  it("يحوّل القيمة الفاضية لسلسلة فاضية", () => {
    const csv = toCSV([{ a: 1, b: null }], ["a", "b"]);
    expect(csv.split("\n")[1]).toBe("1,");
  });
});
