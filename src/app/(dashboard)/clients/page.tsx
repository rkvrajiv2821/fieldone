import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { CustomerHistoryClient } from "@/components/customers/CustomerHistoryClient";

export const metadata = { title: "Customer History" };

export default async function CustomerHistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const managers = await prisma.user.findMany({
    where: { role: Role.MANAGER, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <CustomerHistoryClient
      currentUser={{
        id: session.user.id,
        role: session.user.role,
        canViewAllLeads: session.user.canViewAllLeads,
      }}
      managers={managers}
    />
  );
}