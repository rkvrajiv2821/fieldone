import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === Role.SUPER_ADMIN) redirect("/super-admin");

  return (
    <DashboardClient
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
        canViewAllLeads: session.user.canViewAllLeads,
      }}
    />
  );
}