// src/lib/prisma.ts
// Singleton Prisma client — prevents multiple connections in dev hot-reload

import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

function createAdapter() {
  const url = new URL(process.env.DATABASE_URL!);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapter(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
