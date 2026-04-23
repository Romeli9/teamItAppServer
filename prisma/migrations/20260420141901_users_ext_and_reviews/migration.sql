/*
  Warnings:

  - You are about to drop the column `userId` on the `ProjectRequest` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `Review` table. All the data in the column will be lost.
  - Added the required column `fromUserId` to the `ProjectRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `ProjectRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toUserId` to the `ProjectRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProjectRequest" DROP CONSTRAINT "ProjectRequest_userId_fkey";

-- DropIndex
DROP INDEX "ProjectRequest_userId_idx";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "fromUserId" TEXT,
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "ProjectRequest" DROP COLUMN "userId",
ADD COLUMN     "fromUserId" TEXT NOT NULL,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "toUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "rating",
DROP COLUMN "text",
ADD COLUMN     "comment" TEXT,
ADD COLUMN     "contribution" DOUBLE PRECISION,
ADD COLUMN     "deadlines" DOUBLE PRECISION,
ADD COLUMN     "hardSkills" DOUBLE PRECISION,
ADD COLUMN     "overall" DOUBLE PRECISION,
ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "softSkills" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aboutMe" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "hardSkills" JSONB,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "softSkills" JSONB,
ADD COLUMN     "telegram" TEXT;

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectRequest_fromUserId_idx" ON "ProjectRequest"("fromUserId");

-- CreateIndex
CREATE INDEX "ProjectRequest_toUserId_status_idx" ON "ProjectRequest"("toUserId", "status");

-- CreateIndex
CREATE INDEX "Review_projectId_idx" ON "Review"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectRequest" ADD CONSTRAINT "ProjectRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
