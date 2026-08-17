import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;

  const company = await prisma.company.findUnique({
    where: { isin: isin.toUpperCase() },
  });

  if (!company) {
    return NextResponse.json({ error: `No company found with ISIN ${isin}` }, { status: 404 });
  }

  return NextResponse.json({ company });
}
