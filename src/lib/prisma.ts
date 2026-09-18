import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma client for the process.
 *
 * Next.js reloads modules on every edit in dev, so a plain `new PrismaClient()`
 * would open a fresh connection pool each time until the database refuses more.
 * Stashing it on globalThis keeps one instance across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
