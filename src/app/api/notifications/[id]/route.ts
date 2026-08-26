import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const notification = await prisma.notification.update({
      where: { id, userId: session.user.id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true, data: notification });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.notification.delete({ where: { id, userId: session.user.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025")
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}