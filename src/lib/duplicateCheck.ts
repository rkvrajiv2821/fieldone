// src/lib/duplicateCheck.ts
// Soft duplicate warning (not a hard block) — used by both create and edit customer
// flows to flag every existing customer sharing an Owner Phone, Phone Number
// (staff), or WhatsApp Number, so the caller can confirm before proceeding.

import { prisma } from "@/lib/prisma";

export type DuplicateMatch = {
  name: string;
  company: string | null;
  matchedFields: string[];
};

export async function findDuplicateLeads(
  { phone, managerPhone, whatsappNumber }: { phone: string; managerPhone: string; whatsappNumber?: string },
  excludeId?: string
): Promise<DuplicateMatch[]> {
  const orConditions: any[] = [{ phone }, { managerPhone }];
  if (whatsappNumber) orConditions.push({ whatsappNumber });

  const duplicates = await prisma.lead.findMany({
    where: {
      OR: orConditions,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { name: true, company: true, phone: true, managerPhone: true, whatsappNumber: true },
    take: 10,
  });

  return duplicates.map((d) => {
    const matchedFields: string[] = [];
    if (d.phone === phone) matchedFields.push("Owner Phone Number");
    if (d.managerPhone === managerPhone) matchedFields.push("Phone Number");
    if (whatsappNumber && d.whatsappNumber === whatsappNumber) matchedFields.push("WhatsApp Number");
    return { name: d.name, company: d.company, matchedFields };
  });
}
