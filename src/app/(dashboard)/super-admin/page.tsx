import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, TrendingUp, UserCheck, CalendarClock, ArrowRight } from "lucide-react";

async function getStats() {
  const [totalManagers, activeManagers, totalLeads, totalClients, pendingFollowUps] =
    await Promise.all([
      prisma.user.count({ where: { role: Role.MANAGER } }),
      prisma.user.count({ where: { role: Role.MANAGER, isActive: true } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "CLIENT" } }),
      prisma.followUp.count({ where: { status: "PENDING" } }),
    ]);

  return { totalManagers, activeManagers, totalLeads, totalClients, pendingFollowUps };
}

async function getRecentManagers() {
  return prisma.user.findMany({
    where: { role: Role.MANAGER },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true,
      _count: { select: { leads: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
}

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) redirect("/login");

  const [stats, recentManagers] = await Promise.all([getStats(), getRecentManagers()]);

  const statCards = [
    { label: "Total Managers", value: stats.totalManagers, sub: `${stats.activeManagers} active`, icon: Users, color: "bg-blue-50 text-blue-600", border: "border-blue-100" },
    { label: "Total Leads", value: stats.totalLeads, sub: "Across all managers", icon: TrendingUp, color: "bg-purple-50 text-purple-600", border: "border-purple-100" },
    { label: "Converted Customers", value: stats.totalClients, sub: "Deals closed", icon: UserCheck, color: "bg-emerald-50 text-emerald-600", border: "border-emerald-100" },
    { label: "Pending Follow-ups", value: stats.pendingFollowUps, sub: "Needs attention", icon: CalendarClock, color: "bg-amber-50 text-amber-600", border: "border-amber-100" },
  ];

  return (
    <div className="animate-in">
      <div className="mb-6">
        <h2 className="page-title">Good day, {session.user.name.split(" ")[0]}! 👋</h2>
        <p className="page-subtitle">Here&apos;s a full overview of the system.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className={`crm-card border ${s.border}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent managers */}
      <div className="crm-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Managers</h3>
          <Link href="/super-admin/managers"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Leads</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentManagers.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium text-gray-900">{m.name}</td>
                  <td className="text-gray-500">{m.email}</td>
                  <td className="font-semibold text-gray-900">{m._count.leads}</td>
                  <td>
                    <span className={`status-badge ${m.isActive
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-red-600 bg-red-50 border-red-200"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.isActive ? "bg-emerald-500" : "bg-red-400"}`} />
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentManagers.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No managers yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}