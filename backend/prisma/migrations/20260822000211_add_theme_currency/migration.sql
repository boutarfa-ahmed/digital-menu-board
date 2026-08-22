-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Theme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "colors" TEXT NOT NULL DEFAULT '{}',
    "fonts" TEXT NOT NULL DEFAULT '{}',
    "badgeStyle" TEXT NOT NULL DEFAULT 'torn-paper',
    "currency" TEXT NOT NULL DEFAULT 'CHF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Theme" ("badgeStyle", "colors", "createdAt", "fonts", "id", "isDefault", "name", "updatedAt") SELECT "badgeStyle", "colors", "createdAt", "fonts", "id", "isDefault", "name", "updatedAt" FROM "Theme";
DROP TABLE "Theme";
ALTER TABLE "new_Theme" RENAME TO "Theme";
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
