import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FollowUpStatus, NotificationType } from "@prisma/client";
import { sendFollowUpOverdueAlert, isTwilioConfigured } from "@/lib/twilio";

// Call this via cron every hour — or manually via GET /api/notifications/check-overdue
export async function GET() {
  try {
    const now = new Date();

    const overdue = await prisma.followUp.findMany({
      where: { status: FollowUpStatus.PENDING, scheduledAt: { lt: now } },
      include: {
        lead:       { select: { name: true, company: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    if (overdue.length === 0)
      return NextResponse.json({ success: true, marked: 0 });

    // Mark all overdue
    await prisma.followUp.updateMany({
      where: { id: { in: overdue.map((f) => f.id) } },
      data:  { status: FollowUpStatus.OVERDUE },
    });

    // Group by manager
    const byUser = overdue.reduce((acc: Record<string, typeof overdue>, fu) => {
      const uid = fu.assignedTo.id;
      if (!acc[uid]) acc[uid] = [];
      acc[uid].push(fu);
      return acc;
    }, {});

    await Promise.all(
      Object.entries(byUser).map(async ([userId, fus]) => {
        const first = fus[0];

        // In-app notification
        await prisma.notification.create({
          data: {
            title:   `${fus.length} Follow-up${fus.length > 1 ? "s" : ""} Overdue`,
            message: fus.length === 1
              ? `Your follow-up with "${first.lead.name}" is overdue. Please take action.`
              : `You have ${fus.length} overdue follow-ups including "${first.lead.name}". Please take action.`,
            type:   NotificationType.FOLLOW_UP_OVERDUE,
            userId,
          },
        });

        // WhatsApp alert
        if (isTwilioConfigured()) {
          const manager = await prisma.user.findUnique({
            where:  { id: userId },
            select: { name: true, whatsappNumber: true, phone: true },
          });
          const phone = manager?.whatsappNumber || manager?.phone;
          if (phone) {
            sendFollowUpOverdueAlert({
              managerPhone: phone,
              managerName:  manager!.name,
              leadName:     first.lead.name,
              company:      first.lead.company || undefined,
              overdueCount: fus.length,
            }).catch((e) => console.error("WhatsApp overdue alert error:", e));
          }
        }
      })
    );

    return NextResponse.json({ success: true, marked: overdue.length });
  } catch (error) {
    console.error("check-overdue error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}