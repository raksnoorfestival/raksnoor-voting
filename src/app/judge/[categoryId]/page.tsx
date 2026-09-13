import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Brand } from "@/components/ui";
import { db } from "@/lib/db";
import { requireJudge } from "@/lib/session";
import { ScoreSheet } from "./score-sheet";

export const dynamic = "force-dynamic";

export default async function JudgeCategory({ params }: { params: Promise<{ categoryId: string }> }) {
  const { categoryId } = await params;
  const judge = await requireJudge();
  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      level: true,
      entries: { include: { participant: true, scores: { where: { judgeId: judge.id } } }, orderBy: { number: "asc" } },
      sheets: { where: { judgeId: judge.id } },
    },
  });
  if (!category || category.eventId !== judge.eventId || category.status === "DRAFT") notFound();
  const criteria = await db.criterion.findMany({ where: { eventId: judge.eventId }, orderBy: { priority: "asc" } });

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/judge" className="text-sm text-wine">&larr; Categories</Link>
        <Brand small />
      </header>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{category.level.name}</div>
          <h1 className="text-2xl font-bold">{category.name}</h1>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">{judge.name}</div>
          {category.status === "CLOSED" ? <Badge tone="closed">Closed, read only</Badge> : <Badge tone="open">Open</Badge>}
        </div>
      </div>
      <ScoreSheet
        categoryId={category.id}
        readOnly={category.status !== "OPEN"}
        submitted={!!category.sheets[0]?.submittedAt}
        criteria={criteria.map((c) => ({ id: c.id, name: c.name, maxPoints: c.maxPoints }))}
        entries={category.entries.map((e) => ({
          id: e.id,
          number: e.number,
          name: e.participant.name,
          scores: Object.fromEntries(e.scores.map((s) => [s.criterionId, s.value])),
        }))}
      />
    </main>
  );
}
