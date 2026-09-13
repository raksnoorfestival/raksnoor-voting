import { Badge, Place } from "@/components/ui";
import type { levelChampionship } from "@/lib/results";

type Championship = NonNullable<Awaited<ReturnType<typeof levelChampionship>>>;

// Champion of a level: the sum of final places across the level's
// categories, only for who danced in all of them.
export function ChampionshipTable({ championship }: { championship: Championship }) {
  const { categories, rows } = championship;
  if (rows.length === 0) return <p className="text-sm text-neutral-600">Nobody competed in every category of this level, so there is no champion.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-2">Place</th>
            <th className="py-2 pr-4">Participant</th>
            {categories.map((c) => (
              <th key={c.id} className="py-2 pr-3 text-center">{c.name}</th>
            ))}
            <th className="py-2 pl-2 text-center">Sum of places</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.participantId} className={`border-b border-neutral-100 ${r.unresolvedTie ? "bg-amber-50" : ""}`}>
              <td className="py-2 pr-2"><Place n={r.place} /></td>
              <td className="py-2 pr-4">
                <div className="font-semibold">{r.name}</div>
                <div className="mt-0.5 flex gap-1">
                  {r.unresolvedTie && <Badge tone="visible">Tie</Badge>}
                  {r.decidedByAdmin && <Badge tone="wine">Tie decided</Badge>}
                </div>
              </td>
              {r.perCategory.map((p) => (
                <td key={p.categoryId} className="py-2 pr-3 text-center font-semibold">{p.place}</td>
              ))}
              <td className="py-2 pl-2 text-center text-base font-bold">{r.placeSum}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
