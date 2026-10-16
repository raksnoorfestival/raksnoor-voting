import Link from "next/link";
import { logout } from "@/actions/auth";
import { ActionButton } from "@/components/forms";
import { Badge, Brand, Card, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireJudge } from "@/lib/session";
import { AutoRefresh } from "@/components/auto-refresh";
import { pageStamp } from "@/lib/stamp-server";
import { categoriesOfJudge } from "@/lib/judge-access";

export const dynamic = "force-dynamic";

export default async function JudgeHome() {
  const judge = await requireJudge();
  const me = await db.judge.findUnique({ where: { id: judge.id } });
  const [event, categories, criteriaCount, stamp] = await Promise.all([
    db.event.findUnique({ where: { id: judge.eventId } }),
    db.category.findMany({
      where: { eventId: judge.eventId, status: { in: ["OPEN", "CLOSED"] }, ...(me ? categoriesOfJudge(me) : { id: "none" }) },
      include: {
        level: true,
        _count: { select: { entries: true } },
        sheets: { where: { judgeId: judge.id } },
        entries: { select: { number: true, _count: { select: { scores: { where: { judgeId: judge.id } } } } } },
      },
      orderBy: [{ status: "asc" }, { level: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    db.criterion.count({ where: { eventId: judge.eventId } }),
    pageStamp({ event: judge.eventId }, "none"),
  ]);
  // In the order they are danced: the running order numbers of the lineup
  // go up through the day, so a category comes where its first dancer is.
  // A category with nobody in it goes last.
  const firstOnStage = (c: (typeof categories)[number]) => Math.min(Infinity, ...c.entries.map((e) => e.number));
  const byRunningOrder = (a: (typeof categories)[number], b: (typeof categories)[number]) => firstOnStage(a) - firstOnStage(b);
  const open = categories.filter((c) => c.status === "OPEN").sort(byRunningOrder);
  const closed = categories.filter((c) => c.status === "CLOSED").sort(byRunningOrder);

  const progress = (c: (typeof categories)[number]) => {
    const done = c.entries.filter((e) => e._count.scores >= criteriaCount).length;
    return { done, total: c._count.entries, submitted: !!c.sheets[0]?.submittedAt };
  };

  const list = (items: typeof categories) =>
    items.map((c) => {
      const p = progress(c);
      return (
        <Link key={c.id} href={`/judge/${c.id}`} className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-wine">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{c.level.name}</div>
              <div className="text-lg font-bold">{c.name}</div>
            </div>
            <div className="text-right text-sm">
              {c.status === "CLOSED" ? (
                <Badge tone="closed">Closed</Badge>
              ) : p.submitted ? (
                <Badge tone="open">Submitted</Badge>
              ) : (
                <span className="text-neutral-600">{p.done}/{p.total} scored</span>
              )}
            </div>
          </div>
        </Link>
      );
    });

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <Brand small />
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{judge.name}</span>
          <ActionButton action={logout.bind(null, "judge")} variant="ghost">Sign out</ActionButton>
        </div>
      </header>
      <Title sub={event?.name}>Your categories</Title>
      {open.length === 0 && (
        <Card className="text-sm text-neutral-600">No category is open right now. This page refreshes when the organisation opens one.</Card>
      )}
      <div className="space-y-3">{list(open)}</div>
      {closed.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-neutral-500">Closed (read only)</h2>
          <div className="space-y-3">{list(closed)}</div>
        </>
      )}
      <AutoRefresh seconds={30} watch={{ event: judge.eventId }} scores="none" stamp={stamp} />
    </main>
  );
}
