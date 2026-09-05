import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import "@/i18n";
import App from "@/App";
import { AuthProvider } from "@/auth/auth-context";
import { store } from "@/data/store";

const USER_FIELD = /اسم المستخدم/;

function renderApp() {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>,
  );
}

async function login(username: string) {
  renderApp();
  fireEvent.change(screen.getByPlaceholderText(USER_FIELD), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText("••••••"), {
    target: { value: "123456" },
  });
  fireEvent.click(screen.getByRole("button", { name: "دخول" }));
  await waitFor(() =>
    expect(screen.queryByPlaceholderText(USER_FIELD)).toBeNull(),
  );
}

beforeEach(() => {
  store.reset();
});

describe("الواجهة", () => {
  it("يعرض صفحة الدخول في الوضع التجريبي مع الحسابات الجاهزة", () => {
    renderApp();
    expect(screen.getByText("تسجيل الدخول")).toBeTruthy();
    expect(screen.getByText("مدير المكتب")).toBeTruthy();
    expect(screen.getByText("موظف")).toBeTruthy();
  });

  it("يرفض كلمة مرور غلط", async () => {
    renderApp();
    fireEvent.change(screen.getByPlaceholderText(USER_FIELD), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "دخول" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(USER_FIELD)).toBeTruthy(),
    );
  });

  it("يدخل باليوزر نيم فقط", async () => {
    await login("admin");
    expect(screen.getAllByText(/أهلاً بيك/).length).toBeGreaterThan(0);
  });

  it("اليوزر نيم الغلط مبيدخلش", async () => {
    renderApp();
    fireEvent.change(screen.getByPlaceholderText(USER_FIELD), {
      target: { value: "ghost-user" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "دخول" }));
    await waitFor(() =>
      expect(screen.getByPlaceholderText(USER_FIELD)).toBeTruthy(),
    );
  });

  it("المدير يدخل ويشوف لوحة التحكم بالمؤشرات", async () => {
    await login("admin");
    expect(screen.getAllByText(/أهلاً بيك/).length).toBeGreaterThan(0);
    expect(screen.getByText("إجمالي العقارات")).toBeTruthy();
    expect(screen.getByText("صافي الربح")).toBeTruthy();
    expect(screen.getAllByText("25").length).toBeGreaterThan(0);
  });

  it("قائمة العقارات تعرض 25 عقار للمدير مع الكود المرجعي", async () => {
    await login("admin");
    fireEvent.click(screen.getByRole("link", { name: "العقارات" }));
    await waitFor(() =>
      expect(screen.getAllByText("25 نتيجة").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("PR-1001")).toBeTruthy();
  });

  it("البحث يقلّص النتائج", async () => {
    await login("admin");
    fireEvent.click(screen.getByRole("link", { name: "العقارات" }));
    await waitFor(() =>
      expect(screen.getAllByText("25 نتيجة").length).toBeGreaterThan(0),
    );

    fireEvent.change(screen.getByPlaceholderText("بحث…"), {
      target: { value: "PR-1001" },
    });
    await waitFor(() =>
      expect(screen.getAllByText("1 نتيجة").length).toBeGreaterThan(0),
    );
  });

  it("الموظف يشوف عقاراته فقط (محاكاة RLS)", async () => {
    await login("sara");
    fireEvent.click(screen.getByRole("link", { name: "العقارات" }));
    await waitFor(() =>
      expect(screen.getAllByText("9 نتيجة").length).toBeGreaterThan(0),
    );
  });

  it("الموظف لا يرى صفحة الحسابات", async () => {
    await login("sara");
    expect(screen.queryByRole("link", { name: "الحسابات" })).toBeNull();
  });

  it("المدير يرى صفحة الحسابات والحركات المالية", async () => {
    await login("admin");
    fireEvent.click(screen.getByRole("link", { name: "الحسابات" }));
    await waitFor(() => expect(screen.getByText("الصافي")).toBeTruthy());
    expect(screen.getByText("عمولة عقد CNT-2025001")).toBeTruthy();
  });

  it("صفحة المتابعات تعرض المتأخرة", async () => {
    await login("admin");
    fireEvent.click(screen.getByRole("link", { name: "المتابعات" }));
    await waitFor(() =>
      expect(screen.getAllByText("متأخرة").length).toBeGreaterThan(0),
    );
  });
});
