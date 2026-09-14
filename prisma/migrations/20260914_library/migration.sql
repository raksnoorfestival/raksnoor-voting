-- Written by hand (no shadow database). Two new tables, nothing touched.
CREATE TABLE "LibraryLevel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hasChampionship" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "LibraryLevel_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LibraryLevel_name_key" ON "LibraryLevel"("name");

CREATE TABLE "LibraryCategory" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "LibraryCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LibraryCategory_levelId_name_key" ON "LibraryCategory"("levelId", "name");
ALTER TABLE "LibraryCategory" ADD CONSTRAINT "LibraryCategory_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "LibraryLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
