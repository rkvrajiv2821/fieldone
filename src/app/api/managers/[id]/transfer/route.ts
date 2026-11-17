import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FollowUpStatus, NotificationType, Role } from "@prisma/client";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const OPEN_STATUSES = [FollowUpStatus.PENDING, FollowUpStatus.OVERDUE];

const transferSchema = z.object({
  toManagerId: z.string().min(1),
  deactivate:  z.boolean().optional(),
  // Omit to transfer the manager's whole customer base; send ids to transfer only those customers
  leadIds:     z.array(z.string().min(1)).min(1).max(5000).optional(),
});

async function getCounts(managerId: string) {
  const [customers, converted, openFollowUps, completedFollowUps] = await Promise.all([
    prisma.lead.count({ where: { assignedToId: managerId } }),
    prisma.lead.count({ where: { assignedToId: managerId, status: "CLIENT" } }),
    prisma.followUp.count({ where: { assignedToId: managerId, status: { in: OPEN_STATUSES } } }),
    prisma.followUp.count({ where: { assignedToId: managerId, status: FollowUpStatus.COMPLETED } }),
  ]);
  return { customers, converted, openFollowUps, completedFollowUps };
}

// Preview: what would move if this manager's customer base were transferred
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const manager = await prisma.user.findFirst({
      where: { id, role: Role.MANAGER }, select: { id: true, name: true },
    });
    if (!manager) return NextResponse.json({ error: "Manager not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: await getCounts(id) });
  } catch (error) {
    console.error("GET /api/managers/[id]/transfer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Transfer the whole customer base (leads/customers + open follow-ups) to another manager.
// Only the owner column changes — no customer data is edited or deleted. Completed
// follow-ups stay with the manager who did them. All-or-nothing (single transaction).
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: fromId } = await params;
    const parsed = transferSchema.safeParse(await req.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Please choose a manager to transfer to" }, { status: 400 });

    const { toManagerId, deactivate } = parsed.data;
    const leadIds = parsed.data.leadIds ? Array.from(new Set(parsed.data.leadIds)) : null;
    if (toManagerId === fromId)
      return NextResponse.json({ error: "Choose a different manager to transfer to" }, { status: 400 });

    const [from, to] = await Promise.all([
      prisma.user.findFirst({ where: { id: fromId, role: Role.MANAGER }, select: { id: true, name: true } }),
      prisma.user.findFirst({ where: { id: toManagerId, role: Role.MANAGER, isActive: true }, select: { id: true, name: true } }),
    ]);
    if (!from) return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    if (!to)   return NextResponse.json({ error: "Target manager not found or inactive" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const leadWhere     = leadIds ? { id: { in: leadIds }, assignedToId: fromId } : { assignedToId: fromId };
      const followUpWhere = leadIds
        ? { leadId: { in: leadIds }, assignedToId: fromId, status: { in: OPEN_STATUSES } }
        : { assignedToId: fromId, status: { in: OPEN_STATUSES } };

      const fromLeadsBefore      = await tx.lead.count({ where: { assignedToId: fromId } });
      const toLeadsBefore        = await tx.lead.count({ where: { assignedToId: toManagerId } });
      const totalLeadsBefore     = await tx.lead.count();
      const totalFollowUpsBefore = await tx.followUp.count();
      const expected             = leadIds ? leadIds.length : fromLeadsBefore;

      // Every selected customer must exist and currently belong to the leaving manager
      const matching = await tx.lead.count({ where: leadWhere });
      if (matching !== expected) throw new Error("SELECTION_INVALID");
      const converted = await tx.lead.count({ where: { ...leadWhere, status: "CLIENT" } });

      const leads = await tx.lead.updateMany({ where: leadWhere, data: { assignedToId: toManagerId } });
      const followUps = await tx.followUp.updateMany({ where: followUpWhere, data: { assignedToId: toManagerId } });

      // Safety checks — roll everything back if anything looks off
      const fromLeadsAfter      = await tx.lead.count({ where: { assignedToId: fromId } });
      const toLeadsAfter        = await tx.lead.count({ where: { assignedToId: toManagerId } });
      const totalLeadsAfter     = await tx.lead.count();
      const totalFollowUpsAfter = await tx.followUp.count();
      if (leads.count !== expected ||
          fromLeadsAfter !== fromLeadsBefore - expected ||
          toLeadsAfter   !== toLeadsBefore + expected ||
          totalLeadsAfter !== totalLeadsBefore || totalFollowUpsAfter !== totalFollowUpsBefore)
        throw new Error("TRANSFER_VERIFICATION_FAILED");

      // A manager can only be deactivated here once nothing is left with them
      if (deactivate) {
        if (fromLeadsAfter !== 0) throw new Error("DEACTIVATE_WITH_CUSTOMERS");
        await tx.user.update({ where: { id: fromId }, data: { isActive: false } });
      }

      const summary = {
        from: { id: from.id, name: from.name },
        to:   { id: to.id,   name: to.name },
        customers: leads.count,
        converted,
        openFollowUps: followUps.count,
        remainingCustomers: fromLeadsAfter,
        selected: !!leadIds,
        deactivated: !!deactivate,
      };

      await tx.activityLog.create({
        data: {
          action:  "MANAGER_CUSTOMERS_TRANSFERRED",
          details: JSON.stringify(summary),
          userId:  session.user.id,
        },
      });

      if (leads.count > 0 || followUps.count > 0) {
        await tx.notification.create({
          data: {
            title:   "Customers Transferred to You",
            message: `${leads.count} customer${leads.count === 1 ? "" : "s"} and ${followUps.count} open follow-up${followUps.count === 1 ? "" : "s"} were transferred to you from ${from.name}`,
            type:    NotificationType.LEAD_ASSIGNED,
            userId:  toManagerId,
          },
        });
      }

      return summary;
    }, { timeout: 30000 });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("POST /api/managers/[id]/transfer error:", error);
    if (error?.message === "TRANSFER_VERIFICATION_FAILED")
      return NextResponse.json({ error: "Transfer was cancelled because the counts did not match. No data was changed." }, { status: 409 });
    if (error?.message === "SELECTION_INVALID")
      return NextResponse.json({ error: "Some selected customers no longer belong to this manager. Reload and try again. No data was changed." }, { status: 409 });
    if (error?.message === "DEACTIVATE_WITH_CUSTOMERS")
      return NextResponse.json({ error: "Customers are still assigned to this manager, so they can't be deactivated yet. No data was changed." }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
