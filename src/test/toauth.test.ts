import { describe, expect, it } from "vitest";
import { toAuthEmail } from "@/auth/auth-context";
import { usernameOf } from "@/lib/utils";

describe("toAuthEmail — دخول بيوزر نيم فقط", () => {
  it("بيلصق دومين المكتب دايمًا", () => {
    expect(toAuthEmail("admin")).toBe("admin@realty-office.app");
    expect(toAuthEmail("  Sara ")).toBe("sara@realty-office.app");
  });
});

describe("usernameOf — استخراج الاسم المعروض", () => {
  it("بيرجع الجزء اللي قبل @", () => {
    expect(usernameOf("admin@realty-office.app")).toBe("admin");
    expect(usernameOf(null)).toBe("");
    expect(usernameOf(undefined)).toBe("");
  });
});
