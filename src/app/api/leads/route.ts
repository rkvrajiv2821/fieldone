import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLeadSchema } from "@/lib/validations";
import { Role, LeadStatus, NotificationType } from "@prisma/client";
import { sendLeadAssignedNotification, isTwilioConfigured } from "@/lib/twilio";
import { normalizePhone } from "@/lib/phone";
import { findDuplicateLeads } from "@/lib/duplicateCheck";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search  = searchParams.get("search") || "";
    const status  = searchParams.get("status") as LeadStatus | null;
    const manager = searchParams.get("managerId") || "";
    const page    = parseInt(searchParams.get("page")  || "1");
    const limit   = parseInt(searchParams.get("limit") || "20");
    const skip    = (page - 1) * limit;

    const scopeFilter =
      session.user.role === Role.SUPER_ADMIN || session.user.canViewAllLeads
        ? manager ? { assignedToId: manager } : {}
        : { assignedToId: session.user.id };

    const where: any = {
      ...scopeFilter,
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { name:    { contains: search } },
          { email:   { contains: search } },
          { phone:   { contains: search } },
          { company: { contains: search } },
        ],
      } : {}),
    };

    const [leads, total, blockedNumbers] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          _count: { select: { followUps: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
      prisma.blockedNumber.findMany({ select: { phone: true } }),
    ]);

    const blockedSet = new Set(blockedNumbers.map((b) => b.phone));
    const data = leads.map((lead) => ({ ...lead, isBlocked: blockedSet.has(normalizePhone(lead.phone)) }));

    return NextResponse.json({
      success: true, data, total, page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // ── Bulk CSV import ──────────────────────────────────────────────────────
    if (Array.isArray(body)) {
      const assignedToId =
        session.user.role === Role.MANAGER ? session.user.id : body[0]?.assignedToId;

      const blockedNumbers = await prisma.blockedNumber.findMany({ select: { phone: true } });
      const blockedSet = new Set(blockedNumbers.map((b) => b.phone));

      const blockedRows = body.filter((row: any) => blockedSet.has(normalizePhone(row.phone || "")));
      const allowedRows = body.filter((row: any) => !blockedSet.has(normalizePhone(row.phone || "")));

      const leads = await prisma.$transaction(
        allowedRows.map((row: any) =>
          prisma.lead.create({
            data: {
              name:          row.name,
              email:         row.email         || null,
              phone:         row.phone,
              whatsappNumber: row.whatsapp_number || null,
              company:       row.company        || null,
              source:        row.source         || null,
              notes:         row.notes          || null,
              assignedToId:  row.assignedToId   || assignedToId,
              status:        LeadStatus.LEAD,
            },
          })
        )
      );

      // Single notification for bulk import
      if (assignedToId && leads.length > 0) {
        await prisma.notification.create({
          data: {
            title:   "Leads Imported",
            message: `${leads.length} lead${leads.length > 1 ? "s were" : " was"} imported and assigned to you`,
            type:    NotificationType.LEAD_ASSIGNED,
            userId:  assignedToId,
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: leads,
        count: leads.length,
        blockedCount: blockedRows.length,
        blockedNumbers: blockedRows.map((r: any) => r.phone),
      }, { status: 201 });
    }

    // ── Single lead create ───────────────────────────────────────────────────
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const blocked = await prisma.blockedNumber.findUnique({
      where: { phone: normalizePhone(parsed.data.phone) },
    });
    if (blocked)
      return NextResponse.json({ error: "This number is in the block list and cannot be added as a customer" }, { status: 403 });

    // Warn (don't block) if any phone number is already used by an existing customer —
    // the caller can resubmit with confirmDuplicate: true to proceed anyway.
    if (body.confirmDuplicate !== true) {
      const duplicates = await findDuplicateLeads({
        phone: parsed.data.phone,
        managerPhone: parsed.data.managerPhone,
        whatsappNumber: parsed.data.whatsappNumber,
      });

      if (duplicates.length > 0)
        return NextResponse.json({ duplicateFound: true, duplicates }, { status: 409 });
    }

    const { assignedToId, ...rest } = parsed.data;
    const finalAssignedTo = session.user.role === Role.MANAGER ? session.user.id : assignedToId;

    const lead = await prisma.lead.create({
      data:    {
        ...rest,
        // store optional staff/GST fields as NULL rather than empty strings
        managerName:  rest.managerName  || null,
        managerPhone: rest.managerPhone || null,
        staffType:    rest.staffType    || null,
        gstNumber:    rest.gstNumber    || null,
        assignedToId: finalAssignedTo,
        status: LeadStatus.LEAD,
      },
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
    });

    // Notify the assigned manager (only if super admin is assigning)
    if (session.user.role === Role.SUPER_ADMIN && finalAssignedTo !== session.user.id) {
      await prisma.notification.create({
        data: {
          title:   "New Lead Assigned",
          message: `A new lead "${lead.name}"${lead.company ? ` from ${lead.company}` : ""} has been assigned to you`,
          type:    NotificationType.LEAD_ASSIGNED,
          userId:  finalAssignedTo,
          refId:   lead.id,
          refType: "lead",
        },
      });
    }

    // WhatsApp — lead assigned (only if super admin assigning to a manager)
    if (session.user.role === Role.SUPER_ADMIN && finalAssignedTo !== session.user.id && isTwilioConfigured()) {
      const mgr = await prisma.user.findUnique({
        where:  { id: finalAssignedTo },
        select: { name: true, whatsappNumber: true, phone: true },
      });
      const phone = mgr?.whatsappNumber || mgr?.phone;
      if (phone) {
        sendLeadAssignedNotification({
          managerPhone: phone,
          managerName:  mgr!.name,
          leadName:     lead.name,
          company:      lead.company || undefined,
          source:       lead.source  || undefined,
        }).catch((e) => console.error("WhatsApp lead assigned error:", e));
      }
    }

    // Activity log
    await prisma.activityLog.create({
      data: {
        action:  "LEAD_CREATED",
        details: `Lead ${lead.name} created`,
        userId:  session.user.id,
        leadId:  lead.id,
      },
    });

    return NextResponse.json({ success: true, data: lead }, { status: 201 });
  } catch (error) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}