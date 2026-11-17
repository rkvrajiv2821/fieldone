import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFollowUpSchema } from "@/lib/validations";
import { Role, FollowUpStatus, NotificationType } from "@prisma/client";
import { sendFollowUpReminder, isTwilioConfigured } from "@/lib/twilio";
import { syncLeadStatus } from "@/lib/leadStatus";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status    = searchParams.get("status") as FollowUpStatus | null;
    const managerId = searchParams.get("managerId") || "";
    const leadId    = searchParams.get("leadId") || "";
    const page      = parseInt(searchParams.get("page")  || "1");
    const limit     = parseInt(searchParams.get("limit") || "20");
    const upcoming  = searchParams.get("upcoming") === "true";
    const skip      = (page - 1) * limit;

    const scopeFilter =
      session.user.role === Role.SUPER_ADMIN || session.user.canViewAllLeads
        ? managerId ? { assignedToId: managerId } : {}
        : { assignedToId: session.user.id };

    const now = new Date();

    const where: any = {
      ...scopeFilter,
      ...(status  ? { status }   : {}),
      ...(leadId  ? { leadId }   : {}),
      ...(upcoming ? { scheduledAt: { gte: now }, status: FollowUpStatus.PENDING } : {}),
    };

    const [followUps, total] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          lead:       { select: { id: true, name: true, email: true, company: true, phone: true, status: true } },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: upcoming ? { scheduledAt: "asc" } : { scheduledAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.followUp.count({ where }),
    ]);

    // Auto-mark overdue
    const overdueIds = followUps
      .filter((f) => f.status === FollowUpStatus.PENDING && new Date(f.scheduledAt) < now)
      .map((f) => f.id);

    if (overdueIds.length > 0) {
      await prisma.followUp.updateMany({
        where: { id: { in: overdueIds } },
        data:  { status: FollowUpStatus.OVERDUE },
      });
      followUps.forEach((f) => {
        if (overdueIds.includes(f.id)) f.status = FollowUpStatus.OVERDUE;
      });
    }

    return NextResponse.json({
      success: true, data: followUps, total, page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/follow-ups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = createFollowUpSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const { leadId, scheduledAt, notes, priority, contactMethod, purpose } = parsed.data;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (session.user.role === Role.MANAGER && !session.user.canViewAllLeads) {
      if (lead.assignedToId !== session.user.id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Payment collection follow-ups are always High priority, regardless of what the client sent
    const finalPriority = purpose?.trim().toLowerCase() === "payment collection" ? "HIGH" : priority;

    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        scheduledAt:   new Date(scheduledAt),
        notes:         notes || null,
        priority:      finalPriority,
        contactMethod: contactMethod || null,
        purpose:       purpose || null,
        status:        FollowUpStatus.PENDING,
        assignedToId:  lead.assignedToId,
      },
      include: {
        lead:       { select: { id: true, name: true, email: true, company: true, phone: true, status: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    followUp.lead.status = await syncLeadStatus(leadId);

    // Get manager's contact info for WhatsApp
    const manager = await prisma.user.findUnique({
      where:  { id: lead.assignedToId },
      select: { name: true, whatsappNumber: true, phone: true },
    });

    const managerPhone = manager?.whatsappNumber || manager?.phone;

    // ── In-app notification ──────────────────────────────────────────────────
    await prisma.notification.create({
      data: {
        title:   "Follow-up Scheduled",
        message: `Follow-up with ${lead.name} scheduled for ${new Date(scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
        type:    NotificationType.FOLLOW_UP_DUE,
        userId:  lead.assignedToId,
        refId:   followUp.id,
        refType: "followUp",
      },
    });

    // ── WhatsApp notification ────────────────────────────────────────────────
    if (managerPhone && isTwilioConfigured()) {
      // Don't await — fire and forget so API responds fast
      sendFollowUpReminder({
        managerPhone,
        managerName:   manager!.name,
        leadName:      lead.name,
        company:       lead.company || undefined,
        scheduledTime: new Date(scheduledAt).toLocaleString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
        priority: finalPriority,
      }).catch((e) => console.error("WhatsApp follow-up reminder error:", e));
    }

    return NextResponse.json({ success: true, data: followUp }, { status: 201 });
  } catch (error) {
    console.error("POST /api/follow-ups error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}