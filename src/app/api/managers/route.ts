import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createManagerSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// GET /api/managers — list all managers (super admin only)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const managers = await prisma.user.findMany({
      where: { role: Role.MANAGER },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        whatsappNumber: true,
        isActive: true,
        canViewAllLeads: true,
        createdAt: true,
        _count: {
          select: {
            leads: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Enrich with converted clients count
    const enriched = await Promise.all(
      managers.map(async (m) => {
        const convertedCustomers = await prisma.lead.count({
          where: { assignedToId: m.id, status: "CLIENT" },
        });
        const pendingFollowUps = await prisma.followUp.count({
          where: { assignedToId: m.id, status: "PENDING" },
        });
        return { ...m, convertedCustomers, pendingFollowUps };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error("GET /api/managers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/managers — create a new manager
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createManagerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password, phone, whatsappNumber, canViewAllLeads } = parsed.data;

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const manager = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        phone: phone || null,
        whatsappNumber: whatsappNumber || null,
        role: Role.MANAGER,
        isActive: true,
        canViewAllLeads: canViewAllLeads ?? false,
        createdById: session.user.id,
      },
      select: {
        id: true, name: true, email: true,
        phone: true, isActive: true, canViewAllLeads: true, createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: manager }, { status: 201 });
  } catch (error) {
    console.error("POST /api/managers error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}