-- AlterTable
ALTER TABLE "Criterion" ADD COLUMN     "everywhere" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "_CriterionCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CriterionCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CriterionCategories_B_index" ON "_CriterionCategories"("B");

-- AddForeignKey
ALTER TABLE "_CriterionCategories" ADD CONSTRAINT "_CriterionCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CriterionCategories" ADD CONSTRAINT "_CriterionCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Criterion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

