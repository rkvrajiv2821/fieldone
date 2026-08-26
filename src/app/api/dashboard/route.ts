import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, FollowUpStatus, LeadStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const managerId = searchParams.get("managerId") || "";

    const isSuper = session.user.role === Role.SUPER_ADMIN;
    const scopeId = isSuper && managerId ? managerId
      : !isSuper ? session.user.id
      : undefined;

    const leadWhere    = scopeId ? { assignedToId: scopeId } : {};
    const followWhere  = scopeId ? { assignedToId: scopeId } : {};

    const now          = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalLeads,       totalLeadsLastMonth,
      convertedCustomers, convertedLastMonth,
      pendingFollowUps, pendingLastMonth,
      todayFollowUps,   overdueCount,
      recentLeads,      upcomingFollowUps,
      leadsByStatus,    leadsBySource,
      monthlyLeads,
    ] = await Promise.all([
      prisma.lead.count({ where: leadWhere }),
      prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: lastMonth, lte: endLastMonth } } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.CLIENT } }),
      prisma.lead.count({ where: { ...leadWhere, status: LeadStatus.CLIENT, updatedAt: { gte: lastMonth, lte: endLastMonth } } }),
      prisma.followUp.count({ where: { ...followWhere, status: FollowUpStatus.PENDING } }),
      prisma.followUp.count({ where: { ...followWhere, status: FollowUpStatus.PENDING, createdAt: { gte: lastMonth, lte: endLastMonth } } }),
      prisma.followUp.count({ where: { ...followWhere, scheduledAt: { gte: startOfToday, lte: endOfToday } } }),
      prisma.followUp.count({ where: { ...followWhere, status: FollowUpStatus.OVERDUE } }),

      // Recent leads
      prisma.lead.findMany({
        where: { ...leadWhere, createdAt: { gte: startOfMonth } },
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Today's follow-ups (pending + overdue — everything still needing action today)
      prisma.followUp.findMany({
        where: {
          ...followWhere,
          scheduledAt: { gte: startOfToday, lte: endOfToday },
          status: { in: [FollowUpStatus.PENDING, FollowUpStatus.OVERDUE] },
        },
        include: {
          lead: { select: { id: true, name: true, company: true, phone: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 20,
      }),

      // Leads by pipeline status
      prisma.lead.groupBy({ by: ["status"], where: leadWhere, _count: { id: true } }),

      // Leads by source
      prisma.lead.groupBy({ by: ["source"], where: { ...leadWhere, source: { not: null } }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 6 }),

      // Monthly leads for chart (last 6 months)
      prisma.$queryRawUnsafe<{ month: string; count: number }[]>(`
        SELECT DATE_FORMAT(created_at, '%b %Y') as month,
               COUNT(*) as count
        FROM leads
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        ${scopeId ? `AND assigned_to_id = '${scopeId}'` : ""}
        GROUP BY DATE_FORMAT(created_at, '%b %Y'), YEAR(created_at), MONTH(created_at)
        ORDER BY YEAR(created_at) ASC, MONTH(created_at) ASC
      `),
    ]);

    const pct = (curr: number, prev: number) =>
      prev === 0 ? 100 : Math.round(((curr - prev) / prev) * 100);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalLeads,
          pendingFollowUps,
          convertedCustomers,
          todayFollowUps,
          overdueCount,
          changes: {
            leads:    pct(totalLeads, totalLeadsLastMonth),
            followUps: pct(pendingFollowUps, pendingLastMonth),
            clients:  pct(convertedCustomers, convertedLastMonth),
          },
        },
        recentLeads,
        upcomingFollowUps,
        charts: {
          leadsByStatus: leadsByStatus.map((s) => ({ name: s.status, value: s._count.id })),
          leadsBySource: leadsBySource.map((s) => ({ name: s.source || "Unknown", value: s._count.id })),
          monthlyLeads:  monthlyLeads.map((m) => ({ month: m.month, newCustomers: Number(m.count) })),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}