import { beforeEach, describe, expect, it } from "vitest";
import { propertiesRepo, clientsRepo, fetchAll, appMode } from "@/data/service";
import { store } from "@/data/store";
import type { Property } from "@/types";

const baseProperty = {
  ref_code: "PR-9001",
  title: "شقة اختبار 120م",
  description: null,
  purpose: "sale" as const,
  type: "apartment" as const,
  status: "available" as const,
  area_sqm: 120,
  bedrooms: 2,
  bathrooms: 1,
  floor_no: 3,
  total_floors: 10,
  finishing: "fully_finished" as const,
  price: 2500000,
  rent_period: null,
  governorate: "القاهرة",
  district: "المقطم",
  address: null,
  images: [],
  owner_name: "مالك تجريبي",
  owner_phone: "01000000000",
  agent_id: "u-1",
  featured: false,
  notes: null,
  created_by: "u-admin",
  updated_at: new Date().toISOString(),
};

describe("طبقة البيانات (وضع تجريبي)", () => {
  beforeEach(() => {
    store.reset();
  });

  it("يعمل في الوضع التجريبي بدون مفاتيح Supabase", () => {
    expect(appMode).toBe("demo");
  });

  it("يجلب البيانات التجريبية كاملة", async () => {
    const all = await fetchAll();
    expect(all.properties).toHaveLength(25);
    expect(all.clients).toHaveLength(14);
    expect(all.leads).toHaveLength(20);
    expect(all.contracts).toHaveLength(9);
    expect(all.profiles).toHaveLength(4);
    expect(all.transactions.length).toBeGreaterThan(0);
  });

  it("ينشئ عقارًا جديدًا ويظهر في القائمة", async () => {
    const created = await propertiesRepo.create(baseProperty as never);
    expect(created.id).toBeTruthy();
    expect(created.created_at).toBeTruthy();

    const list = await propertiesRepo.list();
    expect(list).toHaveLength(26);
    expect(list[0].title).toBe("شقة اختبار 120م");
  });

  it("يعدّل عقارًا موجودًا", async () => {
    const created = await propertiesRepo.create(baseProperty as never);
    const updated = await propertiesRepo.update(created.id, {
      price: 3000000,
      status: "reserved",
    } as Partial<Property>);

    expect(Number(updated.price)).toBe(3000000);
    expect(updated.status).toBe("reserved");

    const fetched = await propertiesRepo.get(created.id);
    expect(fetched?.price).toBe(3000000);
  });

  it("يحذف عقارًا", async () => {
    const created = await propertiesRepo.create(baseProperty as never);
    await propertiesRepo.remove(created.id);
    const list = await propertiesRepo.list();
    expect(list).toHaveLength(25);
    expect(await propertiesRepo.get(created.id)).toBeNull();
  });

  it("إعادة التعيين ترجع البيانات الأصلية", async () => {
    await propertiesRepo.create(baseProperty as never);
    expect(await propertiesRepo.list()).toHaveLength(26);
    store.reset();
    expect(await propertiesRepo.list()).toHaveLength(25);
  });

  it("يضيف عميلًا ويحفظه بنفس البيانات", async () => {
    const created = await clientsRepo.create({
      full_name: "عميل اختبار",
      phone: "01099999999",
      email: null,
      kind: "buyer",
      status: "lead",
      source: "facebook",
      budget: 1500000,
      notes: null,
      assigned_to: "u-1",
    } as never);

    expect(created.id).toBeTruthy();
    const list = await clientsRepo.list();
    expect(list).toHaveLength(15);
    expect(list.find((c) => c.id === created.id)?.full_name).toBe("عميل اختبار");
  });
});
