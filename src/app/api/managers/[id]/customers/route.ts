import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FollowUpStatus, Role } from "@prisma/client";

// Read-only: the customers currently owned by a manager (for choosing which ones to transfer)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const manager = await prisma.user.findFirst({ where: { id, role: Role.MANAGER }, select: { id: true } });
    if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });

    const leads = await prisma.lead.findMany({
      where: { assignedToId: id },
      select: {
        id: true, name: true, company: true, phone: true, status: true,
        followUps: { where: { assignedToId: id, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.OVERDUE] } }, select: { id: true } },
      },
      orderBy: [{ company: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: leads.map(({ followUps, ...l }) => ({ ...l, openFollowUps: followUps.length })),
    });
  } catch (error) {
    console.error("GET /api/managers/[id]/customers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
