// src/app/page.tsx
// Root page — middleware handles redirects, this is a fallback

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === Role.SUPER_ADMIN) {
    redirect("/super-admin");
  }

  redirect("/dashboard");
}
