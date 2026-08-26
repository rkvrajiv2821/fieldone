"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  LayoutDashboard, Users, UserCheck, CalendarClock,
  BarChart3, Bell, Settings, LogOut, TrendingUp, Shield, X, Menu, Package, Ban,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SidebarUser { id: string; name: string; email: string; role: Role; }

const navItems = [
  { label: "Overview",      href: "/super-admin",          icon: Shield,        roles: [Role.SUPER_ADMIN] },
  { label: "Managers",      href: "/super-admin/managers", icon: Users,         roles: [Role.SUPER_ADMIN] },
  { label: "Dashboard",     href: "/dashboard",            icon: LayoutDashboard, roles: [Role.MANAGER] },
  { label: "Customer",         href: "/leads",             icon: TrendingUp,    roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { label: "Follow-ups",       href: "/follow-ups",        icon: CalendarClock, roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { label: "Customer History", href: "/clients",           icon: UserCheck,     roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { label: "Blocked Numbers", href: "/super-admin/blocked-numbers", icon: Ban,  roles: [Role.SUPER_ADMIN] },
  { label: "Products",      href: "/products",             icon: Package,       roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { label: "Reports",       href: "/reports",              icon: BarChart3,     roles: [Role.SUPER_ADMIN, Role.MANAGER] },
  { label: "Notifications", href: "/notifications",        icon: Bell,          roles: [Role.SUPER_ADMIN, Role.MANAGER] },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname  = usePathname();
  const [open, setOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = navItems.filter((i) => i.roles.includes(user.role));

  const isActive = (href: string) => {
    if (href === "/super-admin"  && pathname === "/super-admin")  return true;
    if (href === "/dashboard"    && pathname === "/dashboard")     return true;
    if (href !== "/super-admin"  && href !== "/dashboard")        return pathname.startsWith(href);
    return false;
  };

  const SidebarContent = () => (
    <aside className="flex flex-col h-full w-[260px]" style={{ backgroundColor: "#0F172A" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">GZFieldOne</p>
            <p className="text-slate-500 text-[11px]">
              {user.role === Role.SUPER_ADMIN ? "Super Admin" : "Manager Portal"}
            </p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {filtered.map((item) => (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive(item.href)
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}>
              <item.icon className={cn("w-4 h-4 shrink-0", isActive(item.href) ? "text-white" : "text-slate-500")} />
              {item.label}
            </Link>
          ))}
        </div>
        <div className="my-4 border-t border-white/5" />
        <Link href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <Settings className="w-4 h-4 text-slate-500" />
          Settings
        </Link>
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">{getInitials(user.name)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible lg+) ── */}
      <div className="hidden lg:flex shrink-0">
        <SidebarContent />
      </div>

      {/* ── Mobile hamburger button (in header area via portal not needed — just fixed) ── */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Mobile sidebar overlay ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 flex">
            <SidebarContent />
          </div>
        </>
      )}
    </>
  );
}