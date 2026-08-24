-- CreateEnum
CREATE TYPE "StatementType" AS ENUM ('STANDALONE', 'CONSOLIDATED');

-- DropIndex
DROP INDEX "FinancialStatement_companyId_period_key";

-- AlterTable
ALTER TABLE "FinancialStatement" ADD COLUMN     "statementType" "StatementType";

-- CreateIndex
CREATE UNIQUE INDEX "FinancialStatement_companyId_period_statementType_source_key" ON "FinancialStatement"("companyId", "period", "statementType", "source");

