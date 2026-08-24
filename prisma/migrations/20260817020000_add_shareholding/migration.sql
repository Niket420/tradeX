-- CreateTable
CREATE TABLE "Shareholding" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "promoterHolding" DECIMAL(6,3),
    "publicHolding" DECIMAL(6,3),
    "fiiHolding" DECIMAL(6,3),
    "diiHolding" DECIMAL(6,3),
    "mutualFundHolding" DECIMAL(6,3),
    "pledgedPercentage" DECIMAL(6,3),
    "source" TEXT NOT NULL,
    "rawResponsePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shareholding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shareholding_companyId_idx" ON "Shareholding"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Shareholding_companyId_asOfDate_source_key" ON "Shareholding"("companyId", "asOfDate", "source");

-- AddForeignKey
ALTER TABLE "Shareholding" ADD CONSTRAINT "Shareholding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

