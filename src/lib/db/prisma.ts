import { config } from "dotenv";
import { PrismaClient } from "@/generated/prisma";

// Next.js loads .env.local itself, but standalone scripts run via `tsx`
// (the ingest CLIs) don't get that for free — load it explicitly here.
// dotenv never overrides variables already set in process.env, so this is a
// no-op under `next dev`/`next build`.
config({ path: ".env.local" });

// Standard Next.js dev-mode singleton: without this, Fast Refresh would
// create a new PrismaClient (and a new connection pool) on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
