import { Badge, Place } from "@/components/ui";
import type { CategoryResults } from "@/lib/results";
import { explainTie, type TieExplanation } from "@/lib/ranking";

// One sentence a reader can follow in seconds: what the two still shared,
// and the step that put one above the other.
function tieSentence(other: string, ahead: boolean, why: TieExplanation, sum: number): string {
  const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
  // "1st places, 2nd places, 3rd places" reads as one item: "1st, 2nd and 3rd places".
  const places = why.same.filter((x) => x.endsWith(" places")).map((x) => x.replace(" places", ""));
  const rest = why.same.filter((x) => !x.endsWith(" places"));
  const items = [...(places.length ? [`${list(places)} places`] : []), ...rest];
  const shared = items.length ? ` Same ${list(items)}.` : "";
  const head = `Tied with ${other} on sum of ranks (${sum}).${shared}`;
  if (why.decidedBy) return `${head} ${ahead ? "Ahead" : "Behind"} on ${why.decidedBy.label}: ${why.decidedBy.a} vs ${why.decidedBy.b}.`;
  if (why.byAdmin) return `${head} Decided by the jury.`;
  return `${head} Nothing in the rules separates them: the jury decides.`;
}

function tieLines(rows: CategoryResults["rows"], i: number, criteria: { name: string }[]): string[] {
  const names = criteria.map((c) => c.name);
  const me = rows[i];
  const lines: string[] = [];
  const prev = rows[i - 1];
  if (prev && prev.rankSum === me.rankSum && !me.unresolvedTie) {
    const why = explainTie(me, prev, names);
    if (why) lines.push(tieSentence(prev.entry.participant.name, false, why, me.rankSum));
  }
  const next = rows[i + 1];
  if (next && next.rankSum === me.rankSum) {
    const why = explainTie(me, next, names);
    if (why) lines.push(tieSentence(next.entry.participant.name, true, why, me.rankSum));
  }
  return lines;
}

// The classification of one category, with every judge's points and, when
// asked, each criterion's score. Shared by the admin panel and the public
// page so the two can never disagree.
export function ResultsTable({ results, detailed }: { results: CategoryResults; detailed: boolean }) {
  const { judges, criteria, rows } = results;
  if (rows.length === 0) return <p className="text-sm text-neutral-600">No participants.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
            <th className="py-2 pr-2">Place</th>
            <th className="py-2 pr-2">No.</th>
            <th className="py-2 pr-4">Participant</th>
            {judges.map((j) => (
              <th key={j.id} className="py-2 pr-3 text-center">
                {j.name}
              </th>
            ))}
            <th className="py-2 pl-2 text-center">Sum of ranks</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.entryId} className={`border-b border-neutral-100 align-top ${r.unresolvedTie ? "bg-amber-50" : ""}`}>
              <td className="py-2 pr-2">
                <Place n={r.place} />
              </td>
              <td className="py-2 pr-2 text-neutral-500">{r.entry.number}</td>
              <td className="py-2 pr-4">
                <div className="font-semibold">{r.entry.participant.name}</div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {r.unresolvedTie && <Badge tone="visible">Tie</Badge>}
                  {r.decidedByAdmin && <Badge tone="wine">Tie decided</Badge>}
                  {!r.complete && <Badge>Incomplete</Badge>}
                </div>
                {tieLines(rows, i, criteria).map((line) => (
                  <div key={line} className="mt-1 max-w-[28rem] text-xs leading-snug text-neutral-600">
                    {line}
                  </div>
                ))}
              </td>
              {r.judges.map((j) => (
                <td key={j.judgeId} className="py-2 pr-3 text-center">
                  <div className="font-semibold">{j.complete ? j.points : `${j.points}*`}</div>
                  <div className="text-xs text-neutral-500">rank {j.rank}</div>
                  {detailed && (
                    <div className="mt-1 flex justify-center gap-1 text-[11px] text-neutral-600">
                      {j.byCriterion.map((v, i) => (
                        <span key={criteria[i].id} title={criteria[i].name} className="rounded bg-neutral-100 px-1">
                          {v ?? "-"}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              ))}
              <td className="py-2 pl-2 text-center text-base font-bold">{r.rankSum}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {detailed && (
        <p className="mt-2 text-xs text-neutral-500">
          Small numbers under each judge: {criteria.map((c) => c.name).join(", ")}, in that order. An asterisk means the judge has not scored every criterion yet.
        </p>
      )}
    </div>
  );
}

export function TieNotice({ results }: { results: CategoryResults }) {
  const tied = results.rows.filter((r) => r.unresolvedTie);
  if (tied.length === 0) return null;
  const groups = new Map<number, string[]>();
  for (const r of tied) groups.set(r.place, [...(groups.get(r.place) ?? []), r.entry.participant.name]);
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <strong>Tie to decide:</strong>{" "}
      {[...groups.entries()].map(([place, names]) => `${names.join(" and ")} share place ${place}`).join("; ")}. The rules (sum of ranks, majority of placements, criteria by priority) cannot separate them. The jury decides.
    </div>
  );
}

export function HowRankingWorks({ criteria }: { criteria: { name: string }[] }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
      <div className="mb-1 font-semibold">How the ranking works</div>
      <ol className="list-decimal space-y-0.5 pl-5">
        <li>Each judge scores every criterion from 1 to 10. The sum is the judge&apos;s points, and the points give each participant a rank for that judge.</li>
        <li>The final order is the sum of the ranks across all judges. Lowest wins.</li>
        <li>On a tie, whoever has more 1st places wins; then more 2nd places; then more 3rd.</li>
        <li>Still tied: the criteria decide, in this order: {criteria.map((c) => c.name).join(", ")}.</li>
        <li>Still tied: the jury decides.</li>
      </ol>
    </div>
  );
}
