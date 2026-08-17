-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SecurityType" AS ENUM ('COMMON_EQUITY', 'ETF', 'PREFERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PeriodType" AS ENUM ('QUARTERLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "isin" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "nseSymbol" TEXT,
    "bseCode" TEXT,
    "bseSymbol" TEXT,
    "sector" TEXT,
    "industry" TEXT,
    "securityType" "SecurityType" NOT NULL DEFAULT 'OTHER',
    "status" TEXT,
    "marketCap" DECIMAL(20,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialStatement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" "PeriodType" NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "fiscalQuarter" INTEGER,
    "revenue" DECIMAL(20,2),
    "ebitda" DECIMAL(20,2),
    "ebit" DECIMAL(20,2),
    "pat" DECIMAL(20,2),
    "eps" DECIMAL(12,4),
    "totalAssets" DECIMAL(20,2),
    "totalLiabilities" DECIMAL(20,2),
    "totalDebt" DECIMAL(20,2),
    "cash" DECIMAL(20,2),
    "operatingCashFlow" DECIMAL(20,2),
    "investingCashFlow" DECIMAL(20,2),
    "financingCashFlow" DECIMAL(20,2),
    "roe" DECIMAL(10,4),
    "roce" DECIMAL(10,4),
    "pe" DECIMAL(10,4),
    "pb" DECIMAL(10,4),
    "debtEquity" DECIMAL(10,4),
    "source" TEXT NOT NULL,
    "rawResponsePath" TEXT,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSuccessfulFetchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_isin_key" ON "Company"("isin");

-- CreateIndex
CREATE INDEX "Company_nseSymbol_idx" ON "Company"("nseSymbol");

-- CreateIndex
CREATE INDEX "Company_bseCode_idx" ON "Company"("bseCode");

-- CreateIndex
CREATE INDEX "Company_companyName_idx" ON "Company"("companyName");

-- CreateIndex
CREATE INDEX "FinancialStatement_companyId_idx" ON "FinancialStatement"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialStatement_companyId_period_key" ON "FinancialStatement"("companyId", "period");

-- AddForeignKey
ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
