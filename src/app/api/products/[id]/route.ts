import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ProductPermission } from "@prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  name:        z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  image:       z.string().optional().nullable(),
  price:       z.number().min(0).optional(),
  isActive:    z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

// Check if manager has permission
async function checkPermission(
  userId: string,
  productId: string,
  required: ProductPermission[]
): Promise<boolean> {
  const perm = await prisma.productManagerPermission.findUnique({
    where: { productId_managerId: { productId, managerId: userId } },
  });
  if (!perm) return false;
  if (perm.permission === "FULL_ACCESS") return true;
  return required.includes(perm.permission);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Managers need CREATE or EDIT or FULL_ACCESS permission
    if (session.user.role === Role.MANAGER) {
      const allowed = await checkPermission(session.user.id, id, ["CREATE", "EDIT", "FULL_ACCESS"]);
      if (!allowed) return NextResponse.json({ error: "No permission to edit this product" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const product = await prisma.product.update({
      where: { id },
      data:  parsed.data,
      include: { permissions: { select: { managerId: true, permission: true } } },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}