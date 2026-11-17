import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLeadSchema } from "@/lib/validations";
import { Role, NotificationType } from "@prisma/client";
import { sendLeadAssignedNotification, isTwilioConfigured } from "@/lib/twilio";
import { normalizePhone } from "@/lib/phone";
import { findDuplicateLeads } from "@/lib/duplicateCheck";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        followUps:  { orderBy: { createdAt: "asc" } },
        client:     true,
      },
    });

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (session.user.role === Role.MANAGER && !session.user.canViewAllLeads) {
      if (lead.assignedToId !== session.user.id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const blocked = await prisma.blockedNumber.findUnique({
      where: { phone: normalizePhone(lead.phone) },
    });

    return NextResponse.json({ success: true, data: { ...lead, isBlocked: !!blocked } });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body   = await req.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (session.user.role === Role.MANAGER && !session.user.canViewAllLeads) {
      if (existing.assignedToId !== session.user.id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Warn (don't block) if the phone numbers were actually edited and now match another
    // customer — skip entirely when they weren't touched, so saving unrelated fields on an
    // already-duplicate customer doesn't nag every time. Resubmit with confirmDuplicate:
    // true to proceed anyway.
    const phoneFieldsChanged =
      parsed.data.phone !== existing.phone ||
      parsed.data.managerPhone !== existing.managerPhone ||
      (parsed.data.whatsappNumber || "") !== (existing.whatsappNumber || "");

    if (phoneFieldsChanged && body.confirmDuplicate !== true) {
      const duplicates = await findDuplicateLeads({
        phone: parsed.data.phone,
        managerPhone: parsed.data.managerPhone,
        whatsappNumber: parsed.data.whatsappNumber,
      }, id);

      if (duplicates.length > 0)
        return NextResponse.json({ duplicateFound: true, duplicates }, { status: 409 });
    }

    // Status is never client-settable — a lead only becomes a Customer automatically
    // when one of its follow-ups is completed (see src/lib/conversion.ts).
    const { status: _status, ...rest } = parsed.data;
    const updateData = {
      ...rest,
      // optional staff/GST fields: empty string clears them (NULL); undefined leaves them untouched
      ...(rest.managerName  !== undefined && { managerName:  rest.managerName  || null }),
      ...(rest.managerPhone !== undefined && { managerPhone: rest.managerPhone || null }),
      ...(rest.staffType    !== undefined && { staffType:    rest.staffType    || null }),
      ...(rest.gstNumber    !== undefined && { gstNumber:    rest.gstNumber    || null }),
    };

    const lead = await prisma.lead.update({
      where:   { id },
      data:    updateData,
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });

    // ── Lead reassigned ──────────────────────────────────────────────────────
    const isReassigned =
      parsed.data.assignedToId &&
      parsed.data.assignedToId !== existing.assignedToId;

    if (isReassigned && parsed.data.assignedToId) {
      await prisma.notification.create({
        data: {
          title:   "Lead Assigned to You",
          message: `"${lead.name}"${lead.company ? ` from ${lead.company}` : ""} has been assigned to you`,
          type:    NotificationType.LEAD_ASSIGNED,
          userId:  parsed.data.assignedToId,
          refId:   lead.id,
          refType: "lead",
        },
      });
    }

    // WhatsApp — lead reassigned
    if (isReassigned && parsed.data.assignedToId && isTwilioConfigured()) {
      const newMgr = await prisma.user.findUnique({
        where:  { id: parsed.data.assignedToId },
        select: { name: true, whatsappNumber: true, phone: true },
      });
      const phone = newMgr?.whatsappNumber || newMgr?.phone;
      if (phone) {
        sendLeadAssignedNotification({
          managerPhone: phone,
          managerName:  newMgr!.name,
          leadName:     lead.name,
          company:      lead.company || undefined,
          source:       lead.source  || undefined,
        }).catch((e) => console.error("WhatsApp reassign error:", e));
      }
    }

    // Activity log
    await prisma.activityLog.create({
      data: {
        action:  "LEAD_UPDATED",
        details: `Lead updated: ${JSON.stringify(parsed.data)}`,
        userId:  session.user.id,
        leadId:  id,
      },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    if (session.user.role === Role.MANAGER && existing.assignedToId !== session.user.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}