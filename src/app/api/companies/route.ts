import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * GET /api/companies?q=&limit=&offset=
 *
 * Lists companies from the real Postgres universe. Bounded page size —
 * this backs future UI (e.g. a real Market Universe page), not a bulk
 * export endpoint.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit")) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const where = q
    ? {
        OR: [
          { companyName: { contains: q, mode: "insensitive" as const } },
          { nseSymbol: { contains: q, mode: "insensitive" as const } },
          { bseSymbol: { contains: q, mode: "insensitive" as const } },
          { isin: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      orderBy: { companyName: "asc" },
      take: limit,
      skip: offset,
    }),
  ]);

  return NextResponse.json({ total, limit, offset, companies });
}
