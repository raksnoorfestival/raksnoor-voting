import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { eventResults, levelChampionship } from "@/lib/results";
import { resultsWorkbook, type ExportCategory } from "@/lib/excel";

// Everything, as a spreadsheet: one sheet per category with each judge's
// score per criterion, and a summary with the podiums and champions.
export async function GET() {
  if (!(await getAdmin())) return new NextResponse("Sign in first", { status: 401 });
  const event = await currentEvent();
  if (!event) return new NextResponse("No current event", { status: 404 });
  const levels = await db.level.findMany({ where: { eventId: event.id }, include: { categories: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });

  const results = await eventResults(event.id);
  const categories: ExportCategory[] = [];
  for (const l of levels) {
    for (const c of l.categories) {
      const r = results.get(c.id);
      if (!r) continue;
      categories.push({
        level: l.name,
        name: c.name,
        status: c.status,
        judges: r.judges.map((j) => j.name),
        criteria: r.criteria.map((x) => x.name),
        rows: r.rows.map((row) => ({
          place: row.place,
          number: row.entry.number,
          participant: row.entry.participant.name,
          rankSum: row.rankSum,
          unresolvedTie: row.unresolvedTie,
          judges: row.judges.map((j) => ({ points: j.points, rank: j.rank, byCriterion: j.byCriterion })),
        })),
      });
    }
  }
  const champions = [];
  for (const l of levels.filter((x) => x.hasChampionship)) {
    const ch = await levelChampionship(l.id, results);
    if (ch && ch.rows.length) champions.push({ level: l.name, rows: ch.rows.map((r) => ({ place: r.place, name: r.name, placeSum: r.placeSum })) });
  }
  const buf = resultsWorkbook(event.name, categories, champions);
  const safe = event.name.replace(/[^\w\- ]+/g, "").trim() || "results";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safe} results.xlsx"`,
    },
  });
}
