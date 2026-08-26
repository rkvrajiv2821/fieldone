import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBlockedNumberSchema } from "@/lib/validations";
import { normalizePhone } from "@/lib/phone";
import { Role } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Only Super Admin can manage blocked numbers" }, { status: 403 });

    const blockedNumbers = await prisma.blockedNumber.findMany({
      include: { blockedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: blockedNumbers });
  } catch (error) {
    console.error("GET /api/blocked-numbers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== Role.SUPER_ADMIN)
      return NextResponse.json({ error: "Only Super Admin can block a number" }, { status: 403 });

    const body = await req.json();
    const parsed = createBlockedNumberSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const phone = normalizePhone(parsed.data.phone);
    if (phone.length !== 10)
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number" }, { status: 400 });

    const existing = await prisma.blockedNumber.findUnique({ where: { phone } });
    if (existing) return NextResponse.json({ error: "This number is already blocked" }, { status: 409 });

    const blocked = await prisma.blockedNumber.create({
      data: {
        phone,
        reason: parsed.data.reason || null,
        blockedById: session.user.id,
      },
      include: { blockedBy: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: blocked }, { status: 201 });
  } catch (error) {
    console.error("POST /api/blocked-numbers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
