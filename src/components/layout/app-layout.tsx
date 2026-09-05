import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  BadgeDollarSign,
  Building2,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { siteConfig } from "@/config/site.config";
import { appMode } from "@/lib/supabase";
import { cn, initials, usernameOf } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitch } from "./language-switch";

const NAV = [
  { to: "/", key: "dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/properties", key: "properties", icon: Building2, adminOnly: false },
  { to: "/clients", key: "clients", icon: Users, adminOnly: false },
  { to: "/leads", key: "leads", icon: MessageSquareText, adminOnly: false },
  { to: "/contracts", key: "contracts", icon: BadgeDollarSign, adminOnly: false },
  { to: "/finance", key: "finance", icon: Wallet, adminOnly: true },
  { to: "/staff", key: "staff", icon: Users, adminOnly: true },
  { to: "/settings", key: "settings", icon: Settings, adminOnly: false },
];

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
        {siteConfig.logoInitials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight">
          {siteConfig.name}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {siteConfig.tagline}
        </p>
      </div>
    </div>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {NAV.filter((n) => !n.adminOnly || isAdmin).map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-foreground/70 hover:bg-secondary hover:text-foreground",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{t(`nav.${item.key}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* الشريط الجانبي — سطح المكتب */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-border bg-card lg:flex">
        <div className="border-b border-border p-4">
          <BrandMark />
        </div>
        <SidebarNav />
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between rounded-lg bg-secondary/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {t("settings.mode")}
            </span>
            <Badge variant={appMode === "live" ? "success" : "warning"}>
              {appMode === "live" ? t("mode.live") : t("mode.demo")}
            </Badge>
          </div>
        </div>
      </aside>

      {/* الشريط الجانبي — الموبايل */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 flex-col border-e border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <BrandMark />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="lg:hidden">
              <BrandMark />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-secondary">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {initials(profile?.full_name)}
                  </span>
                  <span className="hidden text-start sm:block">
                    <span className="block text-sm font-medium leading-tight">
                      {profile?.full_name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t(`role.${profile?.role ?? "staff"}`)}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  {t("auth.username")}: {usernameOf(profile?.email)}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    void signOut();
                    toast.success(t("auth.signOut"));
                    navigate("/login");
                  }}
                >
                  <LogOut />
                  {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
