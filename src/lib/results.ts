import { db } from "@/lib/db";
import { rankEntries, rankChampionship, type RankedEntry, type ChampionRow } from "@/lib/ranking";

// Everything a results screen needs for one category, in one query set.
export async function categoryResults(categoryId: string) {
  const category = await db.category.findUnique({
    where: { id: categoryId },
    include: {
      level: true,
      entries: { include: { participant: true }, orderBy: { number: "asc" } },
      sheets: true,
    },
  });
  if (!category) return null;
  const [activeJudges, criteria, scores] = await Promise.all([
    db.judge.findMany({ where: { eventId: category.eventId, active: true }, orderBy: { sortOrder: "asc" } }),
    db.criterion.findMany({ where: { eventId: category.eventId }, orderBy: { priority: "asc" } }),
    db.score.findMany({ where: { entry: { categoryId } } }),
  ]);
  // The panel can change from level to level (in 2025 the fifth judge did).
  // While a category is open every active judge is expected; once it is
  // closed, a judge who scored nothing in it was not on that panel.
  const scored = new Set(scores.map((s) => s.judgeId));
  const judges = category.status === "CLOSED" ? activeJudges.filter((j) => scored.has(j.id)) : activeJudges;
  const ranked = rankEntries(category.entries, judges, criteria, scores);
  const byEntry = new Map(category.entries.map((e) => [e.id, e]));
  const rows = ranked.map((r) => ({ ...r, entry: byEntry.get(r.entryId)! }));
  return { category, judges, criteria, rows, ranked };
}

export type CategoryResults = NonNullable<Awaited<ReturnType<typeof categoryResults>>>;

// The champion of a level: final places of every category of that level.
export async function levelChampionship(levelId: string) {
  const level = await db.level.findUnique({
    where: { id: levelId },
    include: { categories: { orderBy: { sortOrder: "asc" } }, championshipDecisions: true },
  });
  if (!level) return null;
  const perCategory = await Promise.all(level.categories.map((c) => categoryResults(c.id)));
  const places = perCategory
    .filter((r): r is CategoryResults => r !== null)
    .map((r) => ({
      categoryId: r.category.id,
      places: r.rows.map((row) => ({ participantId: row.entry.participantId, place: row.place })),
    }));
  const ranked: ChampionRow[] = rankChampionship(
    places,
    level.championshipDecisions.map((d) => ({ participantId: d.participantId, tieOrder: d.tieOrder })),
  );
  const participants = await db.participant.findMany({ where: { id: { in: ranked.map((r) => r.participantId) } } });
  const names = new Map(participants.map((p) => [p.id, p.name]));
  const allClosed = level.categories.length > 0 && level.categories.every((c) => c.status === "CLOSED");
  return {
    level,
    categories: level.categories,
    rows: ranked.map((r) => ({ ...r, name: names.get(r.participantId) ?? "?" })),
    allClosed,
  };
}

export type Ranked = RankedEntry;
