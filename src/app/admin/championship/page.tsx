import Link from "next/link";
import { ChampionshipTable } from "@/components/championship-table";
import { Badge, Card, Title } from "@/components/ui";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { eventResults, levelChampionship } from "@/lib/results";
import { NoEvent } from "../no-event";
import { ChampionshipTieDecider } from "./tie-decider";

export default async function ChampionshipPage() {
  await requireAdmin();
  const event = await currentEvent();
  if (!event) return <NoEvent />;
  const levels = await db.level.findMany({ where: { eventId: event.id, hasChampionship: true }, orderBy: { sortOrder: "asc" } });
  const results = await eventResults(event.id);
  const championships = await Promise.all(levels.map((l) => levelChampionship(l.id, results)));
  return (
    <>
      <Title sub="The champion of a level is whoever competed in every category of that level and has the lowest sum of final places. Ties: more 1st places, then 2nd, then 3rd, then the jury.">Championship</Title>
      {levels.length === 0 && (
        <Card className="text-sm text-neutral-600">
          No level has a championship. Turn it on in <Link href="/admin/levels" className="text-wine underline">Levels</Link>.
        </Card>
      )}
      <div className="space-y-4">
        {championships.map((ch) => {
          if (!ch) return null;
          const tied = ch.rows.filter((r) => r.unresolvedTie);
          const groups = new Map<number, typeof tied>();
          for (const r of tied) groups.set(r.place, [...(groups.get(r.place) ?? []), r]);
          return (
            <Card key={ch.level.id}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{ch.level.name}</h2>
                <div className="flex gap-2">
                  {ch.allClosed ? <Badge tone="closed">All categories closed</Badge> : <Badge tone="open">Provisional</Badge>}
                  {ch.categories.every((c) => c.resultsVisible) ? <Badge tone="visible">Public</Badge> : <Badge>Not public yet</Badge>}
                </div>
              </div>
              <p className="mb-3 text-xs text-neutral-500">Categories: {ch.categories.map((c) => c.name).join(", ") || "none"}. The public sees this once every one of them is on the public page.</p>
              <ChampionshipTable championship={ch} />
              {groups.size > 0 && (
                <div className="mt-3 space-y-2">
                  {[...groups.entries()].map(([place, group]) => (
                    <ChampionshipTieDecider key={place} levelId={ch.level.id} place={place} rows={group.map((r) => ({ id: r.participantId, name: r.name }))} />
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
