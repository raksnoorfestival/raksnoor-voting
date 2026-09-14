import Link from "next/link";
import { Badge, Brand, Card, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requirePublicAccess } from "@/lib/public-access";
import { AutoRefresh } from "@/components/auto-refresh";
import { categoryResults } from "@/lib/results";
import { FindMe, type Person } from "./find-me";

export const dynamic = "force-dynamic";

export default async function ResultsHome() {
  const { event, isAdmin } = await requirePublicAccess();
  const levels = await db.level.findMany({
    where: { eventId: event.id },
    include: { categories: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  // The public sees published categories only, and a championship only once
  // every category of its level is published.
  const shown = levels
    .map((l) => ({
      ...l,
      championshipReady: l.hasChampionship && l.categories.length > 0 && (isAdmin || l.categories.every((c) => c.resultsVisible)),
      categories: l.categories.filter((c) => isAdmin || c.resultsVisible),
    }))
    .filter((l) => l.categories.length > 0);

  // Every published place, grouped by person, for the name search. The
  // admin sees only what the public sees here, on purpose.
  const published = levels.flatMap((l) => l.categories.filter((c) => c.resultsVisible));
  const byPerson = new Map<string, Person>();
  for (const c of published) {
    const r = await categoryResults(c.id);
    if (!r) continue;
    for (const row of r.rows) {
      const p = byPerson.get(row.entry.participantId) ?? { id: row.entry.participantId, name: row.entry.participant.name, results: [] };
      p.results.push({ categoryId: c.id, level: r.category.level.name, category: c.name, place: row.place, tie: row.unresolvedTie, final: c.status === "CLOSED" });
      byPerson.set(p.id, p);
    }
  }
  const people = [...byPerson.values()].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6 flex items-center justify-between">
        <Brand small />
        {isAdmin && <Link href="/admin" className="text-sm text-wine">Admin</Link>}
      </header>
      <Title sub={event.name}>Results</Title>
      {people.length > 0 && <FindMe people={people} eventName={event.name} />}
      {shown.length === 0 && <Card className="text-sm text-neutral-600">No results published yet. Check back after the categories close.</Card>}
      <div className="space-y-6">
        {shown.map((l) => (
          <section key={l.id}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{l.name}</h2>
              {l.championshipReady && (
                <Link href={`/results/championship/${l.id}`} className="text-sm font-semibold text-wine">
                  Championship &rarr;
                </Link>
              )}
            </div>
            <div className="space-y-2">
              {l.categories.map((c) => (
                <Link key={c.id} href={`/results/${c.id}`} className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-wine">
                  <span className="text-lg font-bold">{c.name}</span>
                  <span className="flex gap-1">
                    {c.status === "OPEN" && <Badge tone="open">Live</Badge>}
                    {isAdmin && !c.resultsVisible && <Badge>Hidden</Badge>}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <AutoRefresh seconds={60} />
    </main>
  );
}
