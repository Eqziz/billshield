-- AlterTable
ALTER TABLE "Bill" ALTER COLUMN "totalCents" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAsset_workspaceId_sha256_key" ON "DocumentAsset"("workspaceId", "sha256");
