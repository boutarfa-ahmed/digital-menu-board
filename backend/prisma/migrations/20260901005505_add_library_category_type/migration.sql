-- AlterTable
ALTER TABLE "LibraryCategory" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'image';

-- AlterTable
ALTER TABLE "LibraryAsset" DROP COLUMN "type";
