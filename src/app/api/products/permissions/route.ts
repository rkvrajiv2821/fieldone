import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role, ProductPermission } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  productId:  z.string().min(1),
  managerId:  z.string().min(1),
  permission: z.nativeEnum(ProductPermission),
});

// GET — fetch all manager permissions for a product
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const permissions = await prisma.productManagerPermission.findMany({
      where: { productId },
    });

    return NextResponse.json({ success: true, data: permissions });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — set (upsert) a manager's permission for a product
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const { productId, managerId, permission } = parsed.data;

    const perm = await prisma.productManagerPermission.upsert({
      where:  { productId_managerId: { productId, managerId } },
      create: { productId, managerId, permission },
      update: { permission },
    });

    return NextResponse.json({ success: true, data: perm });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a manager's permission
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const managerId = searchParams.get("managerId");

    if (!productId || !managerId)
      return NextResponse.json({ error: "productId and managerId required" }, { status: 400 });

    await prisma.productManagerPermission.delete({
      where: { productId_managerId: { productId, managerId } },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Permission not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}