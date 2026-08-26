import { NotificationsClient } from "@/components/notifications/NotificationsClient";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <NotificationsClient
      currentUser={{
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
      }}
    />
  );
}