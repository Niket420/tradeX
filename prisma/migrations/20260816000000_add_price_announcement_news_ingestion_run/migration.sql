-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "open" DECIMAL(14,4) NOT NULL,
    "high" DECIMAL(14,4) NOT NULL,
    "low" DECIMAL(14,4) NOT NULL,
    "close" DECIMAL(14,4) NOT NULL,
    "adjustedClose" DECIMAL(14,4),
    "volume" BIGINT NOT NULL,
    "tradedValue" DECIMAL(20,2),
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "announcementType" TEXT,
    "announcementDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "externalId" TEXT,
    "rawReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceDomain" TEXT,
    "publishedAt" TIMESTAMP(3),
    "language" TEXT,
    "country" TEXT,
    "sourceCountry" TEXT,
    "snippet" TEXT,
    "relevanceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsInserted" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_companyId_idx" ON "PriceHistory"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceHistory_companyId_date_source_key" ON "PriceHistory"("companyId", "date", "source");

-- CreateIndex
CREATE INDEX "Announcement_companyId_idx" ON "Announcement"("companyId");

-- CreateIndex
CREATE INDEX "Announcement_announcementDate_idx" ON "Announcement"("announcementDate");

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_companyId_sourceUrl_key" ON "Announcement"("companyId", "sourceUrl");

-- CreateIndex
CREATE INDEX "NewsArticle_companyId_idx" ON "NewsArticle"("companyId");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_companyId_url_key" ON "NewsArticle"("companyId", "url");

-- CreateIndex
CREATE INDEX "IngestionRun_source_dataType_idx" ON "IngestionRun"("source", "dataType");

-- CreateIndex
CREATE INDEX "IngestionRun_startedAt_idx" ON "IngestionRun"("startedAt");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

