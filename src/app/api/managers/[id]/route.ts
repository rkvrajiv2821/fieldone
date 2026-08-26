import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  canViewAllLeads: z.boolean().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const { newPassword, ...rest } = parsed.data;
    const updateData: any = { ...rest };
    if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12);

    const manager = await prisma.user.update({
      where: { id, role: Role.MANAGER },
      data: updateData,
      select: {
        id: true, name: true, email: true, phone: true,
        whatsappNumber: true, isActive: true, canViewAllLeads: true,
      },
    });

    return NextResponse.json({ success: true, data: manager });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const manager = await prisma.user.findUnique({
      where: { id, role: Role.MANAGER },
      select: {
        id: true, name: true, email: true, phone: true,
        whatsappNumber: true, isActive: true, canViewAllLeads: true, createdAt: true,
        _count: { select: { leads: true } },
      },
    });

    if (!manager)
      return NextResponse.json({ error: "Manager not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: manager });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}