import type { Prisma } from "@prisma/client";

// The one place that says which judges belong to a category: every active
// judge marked "all categories", plus the ones assigned to it by hand.
export function judgesOfCategory(categoryId: string): Prisma.JudgeWhereInput {
  return { active: true, OR: [{ allCategories: true }, { categories: { some: { categoryId } } }] };
}

// And the mirror: which categories a judge may vote in.
export function categoriesOfJudge(judge: { id: string; allCategories: boolean }): Prisma.CategoryWhereInput {
  return judge.allCategories ? {} : { judges: { some: { judgeId: judge.id } } };
}
