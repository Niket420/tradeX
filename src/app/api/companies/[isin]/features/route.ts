import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { computeFinancialGrowth, computePriceReturns } from "@/lib/features";

export async function GET(_request: Request, { params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;

  const company = await prisma.company.findUnique({
    where: { isin: isin.toUpperCase() },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ error: `No company found with ISIN ${isin}` }, { status: 404 });
  }

  const [statements, prices] = await Promise.all([
    prisma.financialStatement.findMany({ where: { companyId: company.id } }),
    prisma.priceHistory.findMany({ where: { companyId: company.id } }),
  ]);

  return NextResponse.json({
    isin: isin.toUpperCase(),
    financialGrowth: computeFinancialGrowth(statements),
    priceReturns: computePriceReturns(prices),
  });
}
