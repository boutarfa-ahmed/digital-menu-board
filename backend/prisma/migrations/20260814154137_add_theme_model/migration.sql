-- CreateTable
CREATE TABLE "Theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "colors" TEXT NOT NULL DEFAULT '{}',
    "fonts" TEXT NOT NULL DEFAULT '{}',
    "badgeStyle" TEXT NOT NULL DEFAULT 'torn-paper',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScreenLayout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "screenId" INTEGER NOT NULL,
    "themeId" INTEGER,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreenLayout_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScreenLayout_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScreenLayout" ("createdAt", "id", "name", "screenId", "settings", "status", "updatedAt") SELECT "createdAt", "id", "name", "screenId", "settings", "status", "updatedAt" FROM "ScreenLayout";
DROP TABLE "ScreenLayout";
ALTER TABLE "new_ScreenLayout" RENAME TO "ScreenLayout";
CREATE UNIQUE INDEX "ScreenLayout_screenId_key" ON "ScreenLayout"("screenId");
CREATE INDEX "ScreenLayout_screenId_idx" ON "ScreenLayout"("screenId");
CREATE INDEX "ScreenLayout_themeId_idx" ON "ScreenLayout"("themeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");
