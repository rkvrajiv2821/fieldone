import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ProductsClient } from "@/components/products/ProductsClient";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const managers = session.user.role === Role.SUPER_ADMIN
    ? await prisma.user.findMany({
        where:   { role: Role.MANAGER, isActive: true },
        select:  { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <ProductsClient
      currentUser={{
        id:   session.user.id,
        role: session.user.role,
      }}
      managers={managers}
    />
  );
}