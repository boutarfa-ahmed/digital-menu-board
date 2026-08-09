-- Rename Display -> Screen (preserves existing data)
ALTER TABLE "Display" RENAME TO "Screen";
ALTER TABLE "Screen" RENAME COLUMN "lastSeen" TO "lastPing";

-- Add new Screen columns
ALTER TABLE "Screen" ADD COLUMN "layout" TEXT NOT NULL DEFAULT '{"template":"full"}';
ALTER TABLE "Screen" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'offline';

-- Pivot tables (implicit many-to-many, Prisma naming)
CREATE TABLE "_CategoryToScreen" (
    "A" INTEGER NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "B" INTEGER NOT NULL REFERENCES "Screen"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "_CategoryToScreen_B_index" ON "_CategoryToScreen"("B");

CREATE UNIQUE INDEX "_CategoryToScreen_AB_unique" ON "_CategoryToScreen"("A", "B");

CREATE TABLE "_MenuItemToScreen" (
    "A" INTEGER NOT NULL REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "B" INTEGER NOT NULL REFERENCES "Screen"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "_MenuItemToScreen_B_index" ON "_MenuItemToScreen"("B");

CREATE UNIQUE INDEX "_MenuItemToScreen_AB_unique" ON "_MenuItemToScreen"("A", "B");
