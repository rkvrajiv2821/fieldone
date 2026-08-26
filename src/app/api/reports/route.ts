import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, LeadStatus, FollowUpStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const managerId  = searchParams.get("managerId") || "";
    const startDate  = searchParams.get("startDate");
    const endDate    = searchParams.get("endDate");
    const reportType = searchParams.get("type") || "summary";

    const isSuper = session.user.role === Role.SUPER_ADMIN;

    const scopeId = isSuper && managerId ? managerId
      : !isSuper ? session.user.id
      : undefined;

    // Date filter only used for time-based charts — NOT for totals
    const dateFilter = {
      ...(startDate && { gte: new Date(startDate) }),
      ...(endDate   && { lte: new Date(endDate) }),
    };
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Base scope filters (NO date filter — always show totals)
    const leadWhere:   any = { ...(scopeId && { assignedToId: scopeId }) };
    const followWhere: any = { ...(scopeId && { assignedToId: scopeId }) };

    // ── Summary report ──────────────────────────────────────────────────────
    if (reportType === "summary") {
      const [
        totalLeads, activeLeads, convertedCustomers,
        pendingFollowUps, completedFollowUps, overdueFollowUps,
        leadsByStatus, leadsBySource, followUpsByPriority,
        monthlyData,
      ] = await Promise.all([
        prisma.lead.count({ where: leadWhere }),
        prisma.lead.count({ where: { ...leadWhere, status: { in: [LeadStatus.LEAD, LeadStatus.FOLLOW_UP] } } }),
        prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.CLIENT } }),
        prisma.followUp.count({ where: { ...followWhere, status: FollowUpStatus.PENDING } }),
        prisma.followUp.count({ where: { ...followWhere, status: FollowUpStatus.COMPLETED } }),
        prisma.followUp.count({ where: { ...followWhere, status: FollowUpStatus.OVERDUE } }),
        prisma.lead.groupBy({ by: ["status"], where: leadWhere, _count: { id: true } }),
        prisma.lead.groupBy({
          by: ["source"],
          where: { ...leadWhere, source: { not: null } },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
        }),
        prisma.followUp.groupBy({ by: ["priority"], where: followWhere, _count: { id: true } }),
        // Monthly chart — date filter applied HERE only
        prisma.$queryRawUnsafe<any[]>(`
          SELECT
            DATE_FORMAT(created_at, '%b %Y') as month,
            YEAR(created_at) as year,
            MONTH(created_at) as month_num,
            COUNT(*) as total_leads,
            SUM(CASE WHEN status = 'CLIENT' THEN 1 ELSE 0 END) as converted
          FROM leads
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
          ${scopeId ? `AND assigned_to_id = '${scopeId}'` : ""}
          GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
          ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
        `),
      ]);

      const conversionRate = totalLeads > 0
        ? Math.round((convertedCustomers / totalLeads) * 100)
        : 0;

      return NextResponse.json({
        success: true,
        data: {
          type: "summary",
          stats: {
            totalLeads, activeLeads, convertedCustomers, conversionRate,
            pendingFollowUps, completedFollowUps, overdueFollowUps,
          },
          charts: {
            leadsByStatus: leadsByStatus.map((s) => ({
              name:  s.status === "LEAD" ? "Lead" : s.status === "FOLLOW_UP" ? "Follow-up" : "Customer",
              value: s._count.id,
            })),
            leadsBySource: leadsBySource.map((s) => ({
              name: s.source || "Unknown", value: s._count.id,
            })),
            followUpsByPriority: followUpsByPriority.map((p) => ({
              name: p.priority, value: p._count.id,
            })),
            monthlyData: monthlyData.map((m) => ({
              month:        m.month,
              newCustomers: Number(m.total_leads),
              converted:    Number(m.converted),
              rate:      Number(m.total_leads) > 0
                ? Math.round((Number(m.converted) / Number(m.total_leads)) * 100)
                : 0,
            })),
          },
        },
      });
    }

    // ── Manager comparison (super admin only) ───────────────────────────────
    if (reportType === "manager_comparison" && isSuper) {
      const managers = await prisma.user.findMany({
        where:  { role: Role.MANAGER, isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      });

      const managerStats = await Promise.all(
        managers.map(async (mgr) => {
          // All-time totals — NO date filter
          const [
            total, converted,
            pending, completed, overdue,
          ] = await Promise.all([
            prisma.lead.count({ where: { assignedToId: mgr.id } }),
            prisma.lead.count({ where: { assignedToId: mgr.id, status: LeadStatus.CLIENT } }),
            prisma.followUp.count({ where: { assignedToId: mgr.id, status: FollowUpStatus.PENDING } }),
            prisma.followUp.count({ where: { assignedToId: mgr.id, status: FollowUpStatus.COMPLETED } }),
            prisma.followUp.count({ where: { assignedToId: mgr.id, status: FollowUpStatus.OVERDUE } }),
          ]);

          // New leads in selected period (for the chart / period comparison)
          const newLeadsInPeriod = hasDateFilter
            ? await prisma.lead.count({
                where: { assignedToId: mgr.id, createdAt: dateFilter },
              })
            : total;

          return {
            managerId:        mgr.id,
            managerName:      mgr.name,
            managerEmail:     mgr.email,
            totalLeads:       total,
            newLeadsInPeriod,
            convertedCustomers: converted,
            conversionRate:   total > 0 ? Math.round((converted / total) * 100) : 0,
            pendingFollowUps:   pending,
            completedFollowUps: completed,
            overdueFollowUps:   overdue,
          };
        })
      );

      return NextResponse.json({
        success: true,
        data: { type: "manager_comparison", managers: managerStats },
      });
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}