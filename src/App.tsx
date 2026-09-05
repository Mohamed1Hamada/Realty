import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/auth/auth-context";
import { AppLayout } from "@/components/layout/app-layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { PropertiesPage } from "@/pages/properties";
import { ClientsPage } from "@/pages/clients";
import { LeadsPage } from "@/pages/leads";
import { ContractsPage } from "@/pages/contracts";
import { FinancePage } from "@/pages/finance";
import { StaffPage } from "@/pages/staff";
import { SettingsPage } from "@/pages/settings";

function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">…</p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!profile) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { profile } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={profile ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/contracts" element={<ContractsPage />} />
        <Route
          path="/finance"
          element={
            <RequireAdmin>
              <FinancePage />
            </RequireAdmin>
          }
        />
        <Route
          path="/staff"
          element={
            <RequireAdmin>
              <StaffPage />
            </RequireAdmin>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
