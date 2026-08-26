# GZFieldOne — Module 1 Setup Guide

## Prerequisites
- Node.js 18+
- MySQL 8.0+ running locally
- npm or yarn

---

## Step 1: Install Dependencies

```bash
cd marketing-crm
npm install
```

---

## Step 2: Configure Environment

Copy `.env.example` to `.env.local` and update:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
# Your MySQL connection string
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/marketing_crm"

# Generate a strong secret: openssl rand -base64 32
NEXTAUTH_SECRET="your-32-char-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Twilio (add later in Module 8)
TWILIO_ACCOUNT_SID="ACxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your_token"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
```

---

## Step 3: Create MySQL Database

```sql
CREATE DATABASE marketing_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## Step 4: Run Prisma Migrations

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push

# Seed with sample data
npm run db:seed
```

---

## Step 5: Start the Dev Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

---

## Login Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@marketingcrm.com | SuperAdmin@123 |
| Manager 1 | arun.kumar@marketingcrm.com | Manager@123 |
| Manager 2 | priya.singh@marketingcrm.com | Manager@123 |

---

## Project Structure

```
marketing-crm/
├── prisma/
│   ├── schema.prisma          ← All DB models
│   └── seed.ts                ← Sample data seeder
├── src/
│   ├── app/
│   │   ├── (auth)/login/      ← Login page
│   │   ├── (dashboard)/       ← Protected pages
│   │   │   ├── layout.tsx     ← Sidebar + Header
│   │   │   ├── dashboard/     ← Manager dashboard
│   │   │   ├── super-admin/   ← Super admin pages
│   │   │   ├── leads/         ← Lead management (Module 5)
│   │   │   ├── follow-ups/    ← Follow-ups (Module 6)
│   │   │   ├── clients/       ← Client conversions (Module 6)
│   │   │   ├── reports/       ← Reports (Module 7)
│   │   │   └── notifications/ ← Notifications (Module 8)
│   │   └── api/               ← API routes
│   ├── components/
│   │   ├── forms/             ← Form components
│   │   ├── layout/            ← Sidebar, Header
│   │   ├── ui/                ← shadcn/ui components
│   │   └── charts/            ← Recharts wrappers
│   ├── lib/
│   │   ├── auth.ts            ← NextAuth config
│   │   ├── prisma.ts          ← DB singleton
│   │   ├── twilio.ts          ← WhatsApp helpers
│   │   ├── utils.ts           ← Utility functions
│   │   └── validations.ts     ← Zod schemas
│   ├── types/
│   │   ├── index.ts           ← Global types
│   │   └── next-auth.d.ts     ← Auth type extensions
│   └── middleware.ts          ← Route protection
├── .env.local
├── .env.example
├── next.config.mjs
├── tailwind.config.ts
└── tsconfig.json
```

---

## What Module 1 Delivers

- ✅ Next.js 14 App Router project
- ✅ Full MySQL schema with Prisma ORM
- ✅ NextAuth JWT authentication
- ✅ Role-based middleware (Super Admin / Manager)
- ✅ Login page with form validation
- ✅ Sidebar + Header layout
- ✅ Notification bell with unread count API
- ✅ Global CSS design system
- ✅ TypeScript types for entire app
- ✅ Zod validation schemas
- ✅ Twilio WhatsApp helper library
- ✅ All utility functions (currency ₹, dates, status config)
- ✅ Seed data with sample users and leads

---

## Next: Module 2

Module 2 will build the **Super Admin — Manager Management** panel:
- Create / edit / deactivate managers
- Set per-manager permissions (can view all leads)
- Manager list with stats
- Reset manager passwords
