import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { FollowUpsClient } from "@/components/followups/FollowUpsClient";

export const metadata = { title: "Follow-ups" };

export default async function FollowUpsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const managers = await prisma.user.findMany({
    where: { role: Role.MANAGER, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  // Load leads for the schedule form dropdown
  const scopeFilter =
    session.user.role === Role.SUPER_ADMIN || session.user.canViewAllLeads
      ? {}
      : { assignedToId: session.user.id };

  // Any customer can get a new follow-up, regardless of current status — status is
  // derived from follow-ups, so a Customer scheduling another one is expected.
  const leads = await prisma.lead.findMany({
    where: scopeFilter,
    select: { id: true, name: true, company: true, phone: true, assignedToId: true },
    orderBy: { name: "asc" },
    take: 200,
  });

  return (
    <FollowUpsClient
      currentUser={{
        id: session.user.id,
        role: session.user.role,
        canViewAllLeads: session.user.canViewAllLeads,
      }}
      managers={managers}
      leads={leads}
    />
  );
}