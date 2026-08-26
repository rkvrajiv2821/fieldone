// prisma/seed.ts
// Run with: npm run db:seed

import "dotenv/config";
import { PrismaClient, Role, LeadStatus, FollowUpStatus, Priority, NotificationType, NotificationChannel } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const url = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.replace(/^\//, ""),
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Seeding database...");

  // ─── Super Admin ─────────────────────────────────────────────────────────
  const superAdminPassword = await bcrypt.hash("SuperAdmin@123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@marketingcrm.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@marketingcrm.com",
      password: superAdminPassword,
      phone: "+91 99999 00000",
      whatsappNumber: "+919999900000",
      role: Role.SUPER_ADMIN,
      isActive: true,
      canViewAllLeads: true,
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email);

  // ─── Manager 1 ───────────────────────────────────────────────────────────
  const manager1Password = await bcrypt.hash("Manager@123", 12);
  const manager1 = await prisma.user.upsert({
    where: { email: "arun.kumar@marketingcrm.com" },
    update: {},
    create: {
      name: "Arun Kumar",
      email: "arun.kumar@marketingcrm.com",
      password: manager1Password,
      phone: "+91 98765 43210",
      whatsappNumber: "+919876543210",
      role: Role.MANAGER,
      isActive: true,
      canViewAllLeads: false,
      createdById: superAdmin.id,
    },
  });
  console.log("✅ Manager 1 created:", manager1.email);

  // ─── Manager 2 ───────────────────────────────────────────────────────────
  const manager2Password = await bcrypt.hash("Manager@123", 12);
  const manager2 = await prisma.user.upsert({
    where: { email: "priya.singh@marketingcrm.com" },
    update: {},
    create: {
      name: "Priya Singh",
      email: "priya.singh@marketingcrm.com",
      password: manager2Password,
      phone: "+91 87654 32109",
      whatsappNumber: "+918765432109",
      role: Role.MANAGER,
      isActive: true,
      canViewAllLeads: false,
      createdById: superAdmin.id,
    },
  });
  console.log("✅ Manager 2 created:", manager2.email);

  // ─── Follow-up Purposes ──────────────────────────────────────────────────
  const defaultPurposes = [
    "Payment Collection",
    "Existing Follow-up Continue",
    "New Requirement Discussion",
    "Product Demo",
    "Quotation Follow-up",
    "Contract Renewal",
    "General Check-in",
  ];
  for (const name of defaultPurposes) {
    await prisma.followUpPurpose.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("✅ Follow-up purposes seeded");

  // ─── Sample Leads for Manager 1 ──────────────────────────────────────────
  const leads = [
    {
      name: "Vikram Patel",
      email: "vikram@buildcraft.com",
      phone: "+91 90000 11111",
      company: "BuildCraft",
      source: "Website",
      status: LeadStatus.FOLLOW_UP,
      assignedToId: manager1.id,
    },
    {
      name: "Sneha Iyer",
      email: "sneha@brandify.com",
      phone: "+91 90000 22222",
      company: "Brandify",
      source: "Referral",
      status: LeadStatus.LEAD,
      assignedToId: manager1.id,
    },
    {
      name: "Rohit Verma",
      email: "rohit@webtech.com",
      phone: "+91 90000 33333",
      company: "WebTech",
      source: "Cold Call",
      status: LeadStatus.CLIENT,
      assignedToId: manager1.id,
    },
    {
      name: "Divya Sharma",
      email: "divya@techstudio.com",
      phone: "+91 90000 44444",
      company: "Tech Studio",
      source: "Ads",
      status: LeadStatus.LEAD,
      assignedToId: manager2.id,
    },
    {
      name: "Kiran Nair",
      email: "kiran@creativeHub.com",
      phone: "+91 90000 55555",
      company: "Creative Hub",
      source: "Website",
      status: LeadStatus.FOLLOW_UP,
      assignedToId: manager2.id,
    },
  ];

  for (const leadData of leads) {
    const lead = await prisma.lead.create({
      data: leadData,
    });

    // Convert lead to client if status is CLIENT
    if (leadData.status === LeadStatus.CLIENT) {
      await prisma.client.create({
        data: {
          leadId: lead.id,
          convertedAt: new Date(),
          notes: "Successfully converted after 3 follow-ups",
        },
      });
    }

    // Add sample follow-ups
    if (leadData.status !== LeadStatus.LEAD) {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          assignedToId: leadData.assignedToId,
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000 * 2), // 2 days from now
          status: FollowUpStatus.PENDING,
          priority: Priority.HIGH,
          contactMethod: "Call",
          notes: "Follow up on the proposal sent last week",
        },
      });
    }

    console.log(`✅ Lead created: ${leadData.name}`);
  }

  // ─── Sample Notifications ─────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        title: "Follow-up Due",
        message: "Follow-up with Vikram Patel (BuildCraft) is scheduled for today at 10:00 AM",
        type: NotificationType.FOLLOW_UP_DUE,
        channel: NotificationChannel.IN_APP,
        userId: manager1.id,
        isRead: false,
      },
      {
        title: "New Lead Assigned",
        message: "A new lead Sneha Iyer from Brandify has been assigned to you",
        type: NotificationType.LEAD_ASSIGNED,
        channel: NotificationChannel.IN_APP,
        userId: manager1.id,
        isRead: false,
      },
      {
        title: "Lead Converted",
        message: "Rohit Verma from WebTech has been successfully converted to a client!",
        type: NotificationType.LEAD_CONVERTED,
        channel: NotificationChannel.IN_APP,
        userId: manager1.id,
        isRead: true,
        readAt: new Date(),
      },
    ],
  });
  console.log("✅ Notifications created");

  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Login Credentials:");
  console.log("─────────────────────────────────────");
  console.log("Super Admin:");
  console.log("  Email   : superadmin@marketingcrm.com");
  console.log("  Password: SuperAdmin@123");
  console.log("\nManager 1:");
  console.log("  Email   : arun.kumar@marketingcrm.com");
  console.log("  Password: Manager@123");
  console.log("\nManager 2:");
  console.log("  Email   : priya.singh@marketingcrm.com");
  console.log("  Password: Manager@123");
  console.log("─────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
