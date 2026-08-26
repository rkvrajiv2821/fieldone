import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ManagersClient } from "@/components/managers/ManagersClient";

export const metadata = { title: "Managers" };

async function getManagers() {
  const managers = await prisma.user.findMany({
    where: { role: Role.MANAGER },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true,
      isActive: true,
      canViewAllLeads: true,
      createdAt: true,
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    managers.map(async (m) => {
      const convertedCustomers = await prisma.lead.count({
        where: { assignedToId: m.id, status: "CLIENT" },
      });
      const pendingFollowUps = await prisma.followUp.count({
        where: { assignedToId: m.id, status: "PENDING" },
      });
      return { ...m, convertedCustomers, pendingFollowUps };
    })
  );

  return enriched;
}

export default async function ManagersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.SUPER_ADMIN) redirect("/login");

  const managers = await getManagers();

  return <ManagersClient initialManagers={managers} />;
}