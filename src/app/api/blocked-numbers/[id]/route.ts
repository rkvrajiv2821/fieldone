import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Only Super Admin can unblock a number" }, { status: 403 });

    const { id } = await params;
    await prisma.blockedNumber.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Blocked number not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
