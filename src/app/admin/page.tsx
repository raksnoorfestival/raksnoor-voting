import Link from "next/link";
import { Badge, Card, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { NoEvent } from "./no-event";
import { AutoRefresh } from "@/components/auto-refresh";

export default async function Dashboard() {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const [levels, judges, criteriaCount, participants] = await Promise.all([
    db.level.findMany({
      where: { eventId: event.id },
      include: {
        categories: {
          include: { _count: { select: { entries: true } }, sheets: true, entries: { select: { _count: { select: { scores: true } } } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.judge.findMany({ where: { eventId: event.id, active: true } }),
    db.criterion.count({ where: { eventId: event.id } }),
    db.participant.count({ where: { eventId: event.id } }),
  ]);
  const categories = levels.flatMap((l) => l.categories);
  const open = categories.filter((c) => c.status === "OPEN");
  const expectedPerCategory = (entries: number) => entries * judges.length * criteriaCount;

  return (
    <>
      <Title sub={event.name}>Dashboard</Title>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Categories", categories.length],
          ["Participants", participants],
          ["Judges", judges.length],
          ["Open now", open.length],
        ].map(([k, v]) => (
          <Card key={String(k)} className="p-4">
            <div className="text-xs uppercase tracking-wide text-neutral-500">{k}</div>
            <div className="text-2xl font-bold">{v}</div>
          </Card>
        ))}
      </div>
      {(judges.length === 0 || criteriaCount === 0) && (
        <Card className="mb-6 border-amber-300 bg-amber-50 text-sm text-amber-900">
          {judges.length === 0 && <div>No judges yet. <Link className="underline" href="/admin/judges">Add the judges</Link> before opening a category.</div>}
          {criteriaCount === 0 && <div>No criteria. <Link className="underline" href="/admin/criteria">Add the scoring criteria</Link>.</div>}
        </Card>
      )}
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Open categories</h2>
      {open.length === 0 && <Card className="mb-6 text-sm text-neutral-600">Nothing open. Open a category from its page when the judges are ready.</Card>}
      <div className="mb-6 space-y-2">
        {open.map((c) => {
          const scored = c.entries.reduce((a, e) => a + e._count.scores, 0);
          const expected = expectedPerCategory(c._count.entries);
          const done = c.sheets.filter((s) => s.submittedAt).length;
          return (
            <Link key={c.id} href={`/admin/categories/${c.id}`} className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-wine">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-neutral-500">{levels.find((l) => l.id === c.levelId)?.name}</div>
                  <div className="text-lg font-bold">{c.name}</div>
                </div>
                <div className="text-right text-sm">
                  <div>{expected ? Math.round((scored / expected) * 100) : 0}% of scores in</div>
                  <div className="text-neutral-500">{done}/{judges.length} judges submitted</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded bg-neutral-100">
                <div className="h-full bg-wine" style={{ width: `${expected ? Math.min(100, (scored / expected) * 100) : 0}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">All categories</h2>
      <div className="space-y-4">
        {levels.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="mb-2 font-semibold">{l.name}</div>
            <div className="flex flex-wrap gap-2">
              {l.categories.map((c) => (
                <Link key={c.id} href={`/admin/categories/${c.id}`} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm hover:border-wine">
                  {c.name}
                  <span className="text-neutral-400">{c._count.entries}</span>
                  {c.status === "OPEN" && <Badge tone="open">Open</Badge>}
                  {c.status === "CLOSED" && <Badge tone="closed">Closed</Badge>}
                  {c.resultsVisible && <Badge tone="visible">Public</Badge>}
                </Link>
              ))}
              {l.categories.length === 0 && <span className="text-sm text-neutral-500">No categories</span>}
            </div>
          </Card>
        ))}
      </div>
      {open.length > 0 && <AutoRefresh seconds={15} />}
    </>
  );
}
