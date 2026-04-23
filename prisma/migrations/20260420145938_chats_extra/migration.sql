-- AlterTable
ALTER TABLE "Chat" ADD COLUMN     "group" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "lastMessageAuthorId" TEXT,
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '';
