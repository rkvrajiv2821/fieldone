import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, FollowUpStatus } from "@prisma/client";
import { z } from "zod";
import { syncLeadStatus } from "@/lib/leadStatus";

const updateSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  notes: z.string().optional().nullable(),
  status: z.nativeEnum(FollowUpStatus).optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  contactMethod: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  completionNote: z.string().optional().nullable(),
  liveLocation: z.string().url().max(500).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });

    if (session.user.role === Role.MANAGER && !session.user.canViewAllLeads) {
      if (existing.assignedToId !== session.user.id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = { ...parsed.data };

    // Payment collection follow-ups are always High priority, regardless of what the client sent
    if (parsed.data.purpose?.trim().toLowerCase() === "payment collection") {
      updateData.priority = "HIGH";
    }

    // If marking complete, set completedAt
    if (parsed.data.status === FollowUpStatus.COMPLETED) {
      if (!parsed.data.liveLocation?.trim())
        return NextResponse.json({ error: "Live location is required to complete a follow-up" }, { status: 400 });
      updateData.completedAt = new Date();
    }

    const followUp = await prisma.followUp.update({
      where: { id },
      data: updateData,
      include: {
        lead: { select: { id: true, name: true, email: true, company: true, phone: true, status: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    // Lead status is derived from its follow-ups — resync after any status change
    if (parsed.data.status) {
      followUp.lead.status = await syncLeadStatus(existing.leadId);
    }

    return NextResponse.json({ success: true, data: followUp });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.followUp.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });

    if (session.user.role === Role.MANAGER && existing.assignedToId !== session.user.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await prisma.followUp.delete({ where: { id } });
    await syncLeadStatus(existing.leadId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}