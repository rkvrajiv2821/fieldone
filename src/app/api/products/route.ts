import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  name:        z.string().min(1, "Product name is required").max(200),
  description: z.string().optional().or(z.literal("")),
  image:       z.string().optional().or(z.literal("")),
  price:       z.number().min(0, "Price cannot be negative"),
  isActive:    z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: any = {
      ...(search ? { OR: [
        { name:        { contains: search } },
        { description: { contains: search } },
      ]} : {}),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        permissions: {
          select: { managerId: true, permission: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // For managers, attach their own permission
    const enriched = products.map((p) => {
      const myPerm = p.permissions.find(
        (pm) => pm.managerId === session.user.id
      );
      return {
        ...p,
        myPermission: session.user.role === Role.SUPER_ADMIN
          ? "FULL_ACCESS"
          : myPerm?.permission ?? "VIEW_ONLY",
      };
    });

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("GET /api/products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body   = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const product = await prisma.product.create({
      data: { ...parsed.data, createdById: session.user.id },
      include: { permissions: true },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}