import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BlockedNumbersClient } from "@/components/blocked-numbers/BlockedNumbersClient";

export const metadata = { title: "Blocked Numbers" };

export default async function BlockedNumbersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) redirect("/login");

  const [blockedNumbers, customers] = await Promise.all([
    prisma.blockedNumber.findMany({
      include: { blockedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lead.findMany({
      select: { id: true, name: true, phone: true, company: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return <BlockedNumbersClient initialBlockedNumbers={blockedNumbers} customers={customers} />;
}
