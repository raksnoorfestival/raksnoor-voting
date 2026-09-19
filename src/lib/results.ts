import { db } from "@/lib/db";
import { rankEntries, rankChampionship, type RankedEntry, type ChampionRow } from "@/lib/ranking";
import { judgesOfCategory, judgeCoversCategory } from "@/lib/judge-access";
import type { Category, Criterion, Entry, Judge, JudgeSheet, Level, Participant, Score } from "@prisma/client";

type LoadedCategory = Category & { level: Level; entries: (Entry & { participant: Participant })[]; sheets: JudgeSheet[] };

// The panel can change from level to level (in 2025 the fifth judge did).
// While a category is open every judge of the category is expected; once
// it is closed, a judge who scored nothing in it was not on that panel.
function build(category: LoadedCategory, candidates: Judge[], criteria: Criterion[], scores: Score[]) {
  const scored = new Set(scores.map((s) => s.judgeId));
  const judges = category.status === "CLOSED" ? candidates.filter((j) => scored.has(j.id)) : candidates;
  const ranked = rankEntries(category.entries, judges, criteria, scores);
  const byEntry = new Map(category.entries.map((e) => [e.id, e]));
  const rows = ranked.map((r) => ({ ...r, entry: byEntry.get(r.entryId)! }));
  return { category, judges, criteria, rows, ranked };
}

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
  const [judges, criteria, scores] = await Promise.all([
    db.judge.findMany({ where: { eventId: category.eventId, ...judgesOfCategory(categoryId) }, orderBy: { sortOrder: "asc" } }),
    db.criterion.findMany({ where: { eventId: category.eventId }, orderBy: { priority: "asc" } }),
    db.score.findMany({ where: { entry: { categoryId } } }),
  ]);
  return build(category, judges, criteria, scores);
}

export type CategoryResults = NonNullable<Awaited<ReturnType<typeof categoryResults>>>;

// The same for every category of an event, in four queries instead of
// four per category. The public results page and the export need all of
// them, and one round trip per category was taking over twenty seconds
// with the database in another country, so the browser gave up.
export async function eventResults(eventId: string): Promise<Map<string, CategoryResults>> {
  const [categories, judges, criteria, scores] = await Promise.all([
    db.category.findMany({
      where: { eventId },
      include: { level: true, entries: { include: { participant: true }, orderBy: { number: "asc" } }, sheets: true },
    }),
    db.judge.findMany({ where: { eventId }, include: { categories: true }, orderBy: { sortOrder: "asc" } }),
    db.criterion.findMany({ where: { eventId }, orderBy: { priority: "asc" } }),
    db.score.findMany({ where: { entry: { category: { eventId } } } }),
  ]);
  const categoryOfEntry = new Map(categories.flatMap((c) => c.entries.map((e) => [e.id, c.id] as const)));
  const scoresByCategory = new Map<string, Score[]>();
  for (const s of scores) {
    const categoryId = categoryOfEntry.get(s.entryId);
    if (!categoryId) continue;
    scoresByCategory.set(categoryId, [...(scoresByCategory.get(categoryId) ?? []), s]);
  }
  const out = new Map<string, CategoryResults>();
  for (const c of categories) {
    const panel = judges.filter((j) => judgeCoversCategory(j, c.id));
    out.set(c.id, build(c, panel, criteria, scoresByCategory.get(c.id) ?? []));
  }
  return out;
}

// The champion of a level: final places of every category of that level.
// Pass the event's results when you already have them, so the level does
// not go back to the database for each category.
export async function levelChampionship(levelId: string, known?: Map<string, CategoryResults>) {
  const level = await db.level.findUnique({
    where: { id: levelId },
    include: { categories: { orderBy: { sortOrder: "asc" } }, championshipDecisions: true },
  });
  if (!level) return null;
  const perCategory = known
    ? level.categories.map((c) => known.get(c.id) ?? null)
    : await Promise.all(level.categories.map((c) => categoryResults(c.id)));
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
