"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type ManagerStat = {
  managerId: string; managerName: string; managerEmail: string;
  totalLeads: number; newLeadsInPeriod: number; convertedCustomers: number;
  conversionRate: number; pendingFollowUps: number; completedFollowUps: number;
  overdueFollowUps: number;
};

export function ManagerComparisonTable({ managers }: { managers: ManagerStat[] }) {
  const sorted = [...managers].sort((a, b) => b.convertedCustomers - a.convertedCustomers);
  const top    = sorted[0];

  // Chart uses all-time totals so it always shows real data
  const chartData = managers.map((m) => ({
    name:    m.managerName.split(" ")[0],
    Leads:   m.totalLeads,
    Customers: m.convertedCustomers,
  }));

  return (
    <div className="space-y-6">
      {/* Top performer */}
      {top && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
          <div className="w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Top Performer</p>
            <p className="text-lg font-bold text-gray-900">{top.managerName}</p>
            <p className="text-sm text-amber-700">
              {top.convertedCustomers} customer{top.convertedCustomers !== 1 ? "s" : ""} converted
              · {top.conversionRate}% rate
            </p>
          </div>
        </div>
      )}

      {/* Chart — always all-time */}
      <div className="crm-card">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">Leads vs Clients by Manager</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">All time</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Total leads assigned vs converted clients per manager</p>
        {chartData.every((d) => d.Leads === 0) ? (
          <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">
            No lead data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={6} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value: any, name: string) => [value, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="NewCustomers"   fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Customers" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detailed table */}
      <div className="crm-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Manager Performance Details</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">All time totals</span>
        </div>
        <div className="overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Manager</th>
                <th className="text-center">Total</th>
                <th className="text-center">Customers</th>
                <th className="text-center">Conv. Rate</th>
                <th className="text-center">Pending</th>
                <th className="text-center">Completed</th>
                <th className="text-center">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m, i) => (
                <tr key={m.managerId}>
                  <td>
                    <div className="flex items-center gap-3">
                      {i === 0 && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0",
                        i === 0 ? "bg-amber-500" : "bg-blue-600"
                      )}>
                        {m.managerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{m.managerName}</p>
                        <p className="text-xs text-gray-400">{m.managerEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center font-semibold text-gray-900">{m.totalLeads}</td>
                  <td className="text-center font-bold text-emerald-600">{m.convertedCustomers}</td>
                  <td className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className={cn(
                        "font-bold text-sm",
                        m.conversionRate >= 50 ? "text-emerald-600" :
                        m.conversionRate >= 25 ? "text-amber-600" : "text-red-500"
                      )}>
                        {m.conversionRate}%
                      </span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1">
                        <div className={cn("h-full rounded-full transition-all",
                          m.conversionRate >= 50 ? "bg-emerald-500" :
                          m.conversionRate >= 25 ? "bg-amber-500" : "bg-red-400"
                        )} style={{ width: `${Math.min(m.conversionRate, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                      m.pendingFollowUps > 0 ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-400")}>
                      {m.pendingFollowUps}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {m.completedFollowUps}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold",
                      m.overdueFollowUps > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400")}>
                      {m.overdueFollowUps}
                    </span>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-400">No managers found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}