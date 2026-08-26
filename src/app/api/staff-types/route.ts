import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaffTypeSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const staffTypes = await prisma.staffType.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ success: true, data: staffTypes });
  } catch (error) {
    console.error("GET /api/staff-types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = createStaffTypeSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const name = parsed.data.name.trim();

    // Reuse an existing staff type with the same name (case-insensitive) instead of duplicating
    const existing = await prisma.staffType.findFirst({
      where: { name: { equals: name } },
    });
    if (existing) return NextResponse.json({ success: true, data: existing });

    const staffType = await prisma.staffType.create({ data: { name } });
    return NextResponse.json({ success: true, data: staffType }, { status: 201 });
  } catch (error) {
    console.error("POST /api/staff-types error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
