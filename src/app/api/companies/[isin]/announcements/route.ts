import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ isin: string }> }) {
  const { isin } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const company = await prisma.company.findUnique({
    where: { isin: isin.toUpperCase() },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json({ error: `No company found with ISIN ${isin}` }, { status: 404 });
  }

  const announcements = await prisma.announcement.findMany({
    where: { companyId: company.id },
    orderBy: { announcementDate: "desc" },
    take: limit,
  });

  return NextResponse.json({ isin: isin.toUpperCase(), announcements });
}
