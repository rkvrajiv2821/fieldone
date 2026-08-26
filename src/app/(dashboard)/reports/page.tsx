import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const managers = await prisma.user.findMany({
    where: { role: Role.MANAGER, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <ReportsClient
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
        canViewAllLeads: session.user.canViewAllLeads,
      }}
      managers={managers}
    />
  );
}