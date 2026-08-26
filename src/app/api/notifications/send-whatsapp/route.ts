import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendFollowUpReminder, sendLeadAssignedNotification } from "@/lib/twilio";
import { Role, NotificationType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  type: z.nativeEnum(NotificationType),
  userId: z.string(),
  refId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const { type, userId, refId } = parsed.data;

    // Get user's WhatsApp number
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, whatsappNumber: true, phone: true },
    });

    if (!user?.whatsappNumber && !user?.phone)
      return NextResponse.json({ error: "No WhatsApp number for this user" }, { status: 400 });

    const phone = user.whatsappNumber || user.phone!;
    let result;

    if (type === NotificationType.FOLLOW_UP_DUE && refId) {
      const followUp = await prisma.followUp.findUnique({
        where: { id: refId },
        include: { lead: { select: { name: true, company: true } } },
      });
      if (!followUp) return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });

      result = await sendFollowUpReminder({
        managerPhone: phone,
        managerName: user.name,
        leadName: followUp.lead.name,
        company: followUp.lead.company || undefined,
        scheduledTime: new Date(followUp.scheduledAt).toLocaleString("en-IN"),
        priority: followUp.priority,
      });
    } else if (type === NotificationType.LEAD_ASSIGNED && refId) {
      const lead = await prisma.lead.findUnique({ where: { id: refId } });
      if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

      result = await sendLeadAssignedNotification({
        managerPhone: phone,
        managerName: user.name,
        leadName: lead.name,
        company: lead.company || undefined,
        source: lead.source || undefined,
      });
    } else {
      return NextResponse.json({ error: "Unsupported notification type" }, { status: 400 });
    }

    if (!result.success)
      return NextResponse.json({ error: result.error }, { status: 500 });

    return NextResponse.json({ success: true, sid: result.sid });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}