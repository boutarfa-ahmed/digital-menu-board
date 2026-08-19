-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MenuItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" REAL NOT NULL,
    "imageUrl" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'available',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "categoryId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MenuItem" ("available", "categoryId", "createdAt", "description", "id", "imageUrl", "name", "price") SELECT "available", "categoryId", "createdAt", "description", "id", "imageUrl", "name", "price" FROM "MenuItem";
DROP TABLE "MenuItem";
ALTER TABLE "new_MenuItem" RENAME TO "MenuItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
