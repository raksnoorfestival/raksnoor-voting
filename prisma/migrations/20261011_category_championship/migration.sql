-- Written by hand (no shadow database). Whether a category is one of its
-- level's championship categories; on for everything that exists.
ALTER TABLE "Category" ADD COLUMN "countsForChampionship" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "LibraryCategory" ADD COLUMN "countsForChampionship" BOOLEAN NOT NULL DEFAULT true;
