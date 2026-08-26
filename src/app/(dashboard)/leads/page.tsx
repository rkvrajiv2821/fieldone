import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { LeadsClient } from "@/components/leads/LeadsClient";

export const metadata = { title: "Customer" };

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Load managers for the assign dropdown (super admin + managers with canViewAllLeads)
  const managers = await prisma.user.findMany({
    where: { role: Role.MANAGER, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <LeadsClient
      currentUser={{
        id: session.user.id,
        role: session.user.role,
        canViewAllLeads: session.user.canViewAllLeads,
      }}
      managers={managers}
    />
  );
}