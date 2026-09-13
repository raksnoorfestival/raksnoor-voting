"use server";

import { db } from "@/lib/db";
import { getJudge } from "@/lib/session";

// One tap, one row. The sheet saves as the judge goes, so a dead battery or
// a lost connection costs one score, not a category.
export async function saveScore(entryId: string, criterionId: string, value: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const judge = await getJudge();
  if (!judge) return { ok: false, error: "Session expired. Sign in again." };
  const entry = await db.entry.findUnique({ where: { id: entryId }, include: { category: true } });
  if (!entry || entry.category.eventId !== judge.eventId) return { ok: false, error: "Unknown entry." };
  if (entry.category.status !== "OPEN") return { ok: false, error: "This category is closed." };
  const criterion = await db.criterion.findUnique({ where: { id: criterionId } });
  if (!criterion || criterion.eventId !== judge.eventId) return { ok: false, error: "Unknown criterion." };
  if (!Number.isInteger(value) || value < 1 || value > criterion.maxPoints) return { ok: false, error: `Score must be 1 to ${criterion.maxPoints}.` };
  await db.score.upsert({
    where: { entryId_judgeId_criterionId: { entryId, judgeId: judge.id, criterionId } },
    create: { entryId, judgeId: judge.id, criterionId, value },
    update: { value },
  });
  return { ok: true };
}

// "I am done with this category": lets the admin see who has finished.
export async function submitSheet(categoryId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const judge = await getJudge();
  if (!judge) return { ok: false, error: "Session expired. Sign in again." };
  const category = await db.category.findUnique({ where: { id: categoryId } });
  if (!category || category.eventId !== judge.eventId) return { ok: false, error: "Unknown category." };
  if (category.status !== "OPEN") return { ok: false, error: "This category is closed." };
  await db.judgeSheet.upsert({
    where: { categoryId_judgeId: { categoryId, judgeId: judge.id } },
    create: { categoryId, judgeId: judge.id, submittedAt: new Date() },
    update: { submittedAt: new Date() },
  });
  return { ok: true };
}
