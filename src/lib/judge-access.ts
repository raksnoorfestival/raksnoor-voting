import type { Judge, JudgeCategory, Prisma } from "@prisma/client";

// The one place that says which judges belong to a category: every active
// judge marked "all categories", plus the ones assigned to it by hand.
export function judgesOfCategory(categoryId: string): Prisma.JudgeWhereInput {
  return { active: true, OR: [{ allCategories: true }, { categories: { some: { categoryId } } }] };
}

// The same rule on judges already loaded (with their assignments), for
// screens that rank a whole event at once. Keep the two in step.
export function judgeCoversCategory(judge: Judge & { categories: JudgeCategory[] }, categoryId: string): boolean {
  return judge.active && (judge.allCategories || judge.categories.some((c) => c.categoryId === categoryId));
}

// And the mirror: which categories a judge may vote in.
export function categoriesOfJudge(judge: { id: string; allCategories: boolean }): Prisma.CategoryWhereInput {
  return judge.allCategories ? {} : { judges: { some: { judgeId: judge.id } } };
}
