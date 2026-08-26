# GZFieldOne

A marketing/sales CRM built with Next.js (App Router), Prisma, and NextAuth — with lead management, follow-ups, client conversions, reports, and WhatsApp notifications via Twilio.

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Database:** MySQL 8.0+ (via Prisma ORM 7 + MariaDB driver adapter)
- **Auth:** NextAuth (JWT sessions, role-based middleware: Super Admin / Manager)
- **Styling:** Tailwind CSS + shadcn/ui (Radix primitives)
- **Other:** Twilio (WhatsApp), Cloudinary (image uploads), Recharts, jsPDF, Zod, React Hook Form

## Prerequisites

- Node.js 18+
- MySQL 8.0+ running locally (or a connection string to a hosted instance)
- npm

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/rkvrajiv2821/fieldone.git
cd fieldone
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your own values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://root:password@localhost:3306/marketing_crm` |
| `NEXTAUTH_SECRET` | Random secret for signing sessions — generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | App URL, e.g. `http://localhost:3000` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (for WhatsApp notifications) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_WHATSAPP_FROM` | Twilio WhatsApp sender number, e.g. `whatsapp:+14155238886` |
| `NEXT_PUBLIC_APP_NAME` | Display name used in the UI |
| `NEXT_PUBLIC_APP_URL` | Public app URL |
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | Currency symbol used in the UI (defaults to `₹`) |

### 3. Create the database

```sql
CREATE DATABASE marketing_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Set up Prisma

```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to the database (creates all tables)
npm run db:seed       # seed sample users, leads, and reference data
```

### 5. Run the dev server

```bash
npm run dev
```

Visit **http://localhost:3000**.

## Login credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@marketingcrm.com | SuperAdmin@123 |
| Manager 1 | arun.kumar@marketingcrm.com | Manager@123 |
| Manager 2 | priya.singh@marketingcrm.com | Manager@123 |

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:migrate` | Run Prisma migrations in dev |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:generate` | Generate the Prisma client |

## Project structure

```
├── prisma/
│   ├── schema.prisma        ← Database models
│   └── seed.ts              ← Sample data seeder
├── src/
│   ├── app/
│   │   ├── (auth)/login/    ← Login page
│   │   ├── (dashboard)/     ← Protected pages (dashboard, leads, follow-ups,
│   │   │                       clients, reports, notifications, super-admin)
│   │   └── api/             ← API routes
│   ├── components/          ← Feature components + shadcn/ui components
│   ├── lib/                 ← Auth config, Prisma client, Twilio/Cloudinary
│   │                           helpers, validation schemas, utilities
│   ├── types/                ← Shared TypeScript types
│   └── middleware.ts         ← Role-based route protection
├── .env.example
└── next.config.mjs
```
