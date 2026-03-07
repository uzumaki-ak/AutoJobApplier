// [F60] src/lib/db/prisma.ts — Prisma client singleton
// Prevents multiple Prisma instances in Next.js hot-reload dev mode
// Uses Neon serverless adapter for edge-compatible connection pooling

import { PrismaClient } from "@prisma/client";
import { dbLogger } from "@/lib/logger";

// Declare global type to persist client across hot reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/** Create a new Prisma client with logging hooks */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

  // Log slow queries in dev for debugging
  if (process.env.NODE_ENV === "development") {
    // @ts-expect-error – prisma event types
    client.$on("query", (e: { query: string; duration: number }) => {
      if (e.duration > 500) {
        dbLogger.warn({ query: e.query, duration: e.duration }, "Slow query detected");
      }
    });
  }

  // @ts-expect-error – prisma event types
  client.$on("error", (e: { message: string }) => {
    dbLogger.error({ message: e.message }, "Prisma error");
  });

  return client;
}

// Singleton: reuse in dev hot reload, create fresh in production
export const db: PrismaClient =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : (global.__prisma ?? (global.__prisma = createPrismaClient()));

dbLogger.info("Prisma client initialized");
