import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/generated/prisma";

/** Tracks one ingestion job run (see IngestionRun model) — one row per script invocation, not per record. */
export interface IngestionRunTracker {
  id: string;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  noteProcessed(): void;
  noteInserted(): void;
  noteUpdated(): void;
  noteSkipped(): void;
  noteFailed(): void;
  finish(status: "SUCCESS" | "PARTIAL" | "FAILED", errorMessage?: string): Promise<void>;
}

export async function startIngestionRun(source: string, dataType: string, metadata?: Record<string, unknown>): Promise<IngestionRunTracker> {
  const run = await prisma.ingestionRun.create({
    data: { source, dataType, status: "RUNNING", metadata: metadata as Prisma.InputJsonValue | undefined },
  });

  const counts = { recordsProcessed: 0, recordsInserted: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0 };

  return {
    id: run.id,
    get recordsProcessed() {
      return counts.recordsProcessed;
    },
    get recordsInserted() {
      return counts.recordsInserted;
    },
    get recordsUpdated() {
      return counts.recordsUpdated;
    },
    get recordsSkipped() {
      return counts.recordsSkipped;
    },
    get recordsFailed() {
      return counts.recordsFailed;
    },
    noteProcessed: () => counts.recordsProcessed++,
    noteInserted: () => counts.recordsInserted++,
    noteUpdated: () => counts.recordsUpdated++,
    noteSkipped: () => counts.recordsSkipped++,
    noteFailed: () => counts.recordsFailed++,
    async finish(status, errorMessage) {
      await prisma.ingestionRun.update({
        where: { id: run.id },
        data: {
          status,
          completedAt: new Date(),
          recordsProcessed: counts.recordsProcessed,
          recordsInserted: counts.recordsInserted,
          recordsUpdated: counts.recordsUpdated,
          recordsSkipped: counts.recordsSkipped,
          recordsFailed: counts.recordsFailed,
          errorMessage,
        },
      });
    },
  };
}
