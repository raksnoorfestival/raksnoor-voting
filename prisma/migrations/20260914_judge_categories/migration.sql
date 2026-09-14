-- Written by hand (no shadow database). A flag on Judge and one link table.
ALTER TABLE "Judge" ADD COLUMN "allCategories" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "JudgeCategory" (
    "judgeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "JudgeCategory_pkey" PRIMARY KEY ("judgeId", "categoryId")
);
ALTER TABLE "JudgeCategory" ADD CONSTRAINT "JudgeCategory_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JudgeCategory" ADD CONSTRAINT "JudgeCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
