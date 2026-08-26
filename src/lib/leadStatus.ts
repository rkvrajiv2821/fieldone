// src/lib/leadStatus.ts
// Lead status is fully derived from its follow-ups — never set manually, and not a one-way ratchet.
//   no follow-ups yet          -> New Customer
//   any follow-up not finished -> Follow-up  (covers PENDING and OVERDUE)
//   at least one follow-up,
//   all of them completed      -> Customer
// This is re-run after every follow-up create/update/delete, so status can cycle back
// from Customer to Follow-up when a new follow-up is scheduled for a repeat engagement.

import { prisma } from "@/lib/prisma";
import { LeadStatus, FollowUpStatus } from "@prisma/client";

export async function syncLeadStatus(leadId: string): Promise<LeadStatus> {
  const followUps = await prisma.followUp.findMany({
    where: { leadId },
    select: { status: true },
  });

  const status: LeadStatus =
    followUps.length === 0
      ? LeadStatus.LEAD
      : followUps.some((f) => f.status !== FollowUpStatus.COMPLETED)
      ? LeadStatus.FOLLOW_UP
      : LeadStatus.CLIENT;

  await prisma.lead.update({ where: { id: leadId }, data: { status } });

  // Once a lead has reached Customer status at least once, keep a permanent record for
  // reporting — even if it later cycles back to Follow-up for a repeat engagement.
  if (status === LeadStatus.CLIENT) {
    await prisma.client.upsert({
      where:  { leadId },
      create: { leadId, convertedAt: new Date() },
      update: {},
    });
  }

  return status;
}
