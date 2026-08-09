-- CreateTable
CREATE TABLE "ScreenLayout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "screenId" INTEGER NOT NULL,
    "name" TEXT,
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreenLayout_screenId_fkey" FOREIGN KEY ("screenId") REFERENCES "Screen" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "layoutId" INTEGER NOT NULL,
    "name" TEXT,
    "zoneType" TEXT NOT NULL DEFAULT 'menu',
    "gridConfig" TEXT NOT NULL DEFAULT '{}',
    "cardTemplate" TEXT NOT NULL DEFAULT 'default',
    "backgroundStyle" TEXT,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 1,
    "h" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Zone_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "ScreenLayout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ZoneItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "zoneId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "row" INTEGER,
    "col" INTEGER,
    "index" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZoneItem_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ZoneItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ScreenLayout_screenId_key" ON "ScreenLayout"("screenId");

-- CreateIndex
CREATE INDEX "ScreenLayout_screenId_idx" ON "ScreenLayout"("screenId");

-- CreateIndex
CREATE INDEX "Zone_layoutId_idx" ON "Zone"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoneItem_zoneId_itemId_key" ON "ZoneItem"("zoneId", "itemId");

-- CreateIndex
CREATE INDEX "ZoneItem_zoneId_idx" ON "ZoneItem"("zoneId");
