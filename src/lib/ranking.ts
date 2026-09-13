// The competition rule, as a pure function so it can be tested without a
// database. Mirrors the 2025 spreadsheet, with its tie-breaker put the right
// way round: more first places is better, not worse.
//
// 1. Each judge's points for an entry are the sum of the criteria.
// 2. Each judge ranks the entries by those points (ties share the rank,
//    like Excel's RANK: 1, 2, 2, 4).
// 3. The final order is by the sum of the ranks, lowest first.
// 4. Tie: more 1st places, then more 2nd, then more 3rd.
// 5. Still tied: compare the criteria one by one in priority order (sum of
//    that criterion across all judges, higher wins).
// 6. Still tied: the admin decides (tieOrder). Without a decision the
//    entries share the place and are flagged so the panel can show an alert.

export type Criterion = { id: string; priority: number };
export type Judge = { id: string };
export type Entry = { id: string; tieOrder?: number | null };
export type Score = { entryId: string; judgeId: string; criterionId: string; value: number };

export type JudgeResult = {
  judgeId: string;
  points: number;
  rank: number;
  /** One value per criterion, in priority order; null when not scored yet. */
  byCriterion: (number | null)[];
  complete: boolean;
};

export type RankedEntry = {
  entryId: string;
  place: number;
  rankSum: number;
  placements: [number, number, number];
  criterionTotals: number[];
  judges: JudgeResult[];
  /** True when every judge scored every criterion. */
  complete: boolean;
  /** True when the rules could not separate this entry from another. */
  unresolvedTie: boolean;
  /** True when the place came from the admin's manual decision. */
  decidedByAdmin: boolean;
};

type Row = {
  entryId: string;
  tieOrder: number | null;
  rankSum: number;
  placements: [number, number, number];
  criterionTotals: number[];
  judges: JudgeResult[];
  complete: boolean;
};

function countPlacements(ranks: number[]): [number, number, number] {
  return [1, 2, 3].map((p) => ranks.filter((r) => r === p).length) as [number, number, number];
}

// Rules 4 and 5 share this shape: bigger is better, compared in order.
function compareDescending(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return b[i] - a[i];
  return 0;
}

// Rule 6: the admin's order, when both sides have one. An entry with an
// order goes before one without, so a half-made decision is still visible.
function compareTieOrder(a: number | null, b: number | null): number {
  if (a != null && b != null) return a - b;
  if (a != null) return -1;
  if (b != null) return 1;
  return 0;
}

// Turns a sorted list into places, sharing the place when the rules could
// not separate two rows and the admin has not decided.
function assignPlaces<T extends { tieOrder: number | null }>(
  sorted: T[],
  byRules: (a: T, b: T) => number,
): { row: T; place: number; unresolvedTie: boolean; decidedByAdmin: boolean }[] {
  const cmp = (a: T, b: T) => byRules(a, b) || compareTieOrder(a.tieOrder, b.tieOrder);
  return sorted.map((row, i) => {
    const equal = sorted.filter((o) => o !== row && byRules(o, row) === 0);
    const decided = equal.length > 0 && row.tieOrder != null && equal.every((o) => o.tieOrder != null);
    const unresolved = equal.length > 0 && !decided;
    const place = unresolved ? 1 + sorted.findIndex((o) => cmp(o, row) === 0) : i + 1;
    return { row, place, unresolvedTie: unresolved, decidedByAdmin: decided };
  });
}

export function rankEntries(
  entries: Entry[],
  judges: Judge[],
  criteria: Criterion[],
  scores: Score[],
): RankedEntry[] {
  const crit = [...criteria].sort((a, b) => a.priority - b.priority);
  const byKey = new Map<string, number>();
  for (const s of scores) byKey.set(`${s.entryId}|${s.judgeId}|${s.criterionId}`, s.value);

  // Points per entry per judge.
  const per = new Map<string, JudgeResult[]>();
  for (const e of entries) {
    per.set(
      e.id,
      judges.map((j) => {
        const byCriterion = crit.map((c) => byKey.get(`${e.id}|${j.id}|${c.id}`) ?? null);
        const points = byCriterion.reduce<number>((a, v) => a + (v ?? 0), 0);
        return { judgeId: j.id, points, rank: 0, byCriterion, complete: byCriterion.every((v) => v !== null) };
      }),
    );
  }

  // Rank per judge, ties sharing the rank.
  judges.forEach((j, ji) => {
    const pts = entries.map((e) => per.get(e.id)![ji].points);
    entries.forEach((e, i) => {
      per.get(e.id)![ji].rank = 1 + pts.filter((p) => p > pts[i]).length;
    });
  });

  const rows: Row[] = entries.map((e) => {
    const js = per.get(e.id)!;
    const ranks = js.map((j) => j.rank);
    return {
      entryId: e.id,
      tieOrder: e.tieOrder ?? null,
      rankSum: ranks.reduce((a, b) => a + b, 0),
      placements: countPlacements(ranks),
      criterionTotals: crit.map((_, ci) => js.reduce((a, j) => a + (j.byCriterion[ci] ?? 0), 0)),
      judges: js,
      complete: js.every((j) => j.complete),
    };
  });

  const byRules = (a: Row, b: Row) =>
    a.rankSum - b.rankSum ||
    compareDescending(a.placements, b.placements) ||
    compareDescending(a.criterionTotals, b.criterionTotals);

  const sorted = [...rows].sort((a, b) => byRules(a, b) || compareTieOrder(a.tieOrder, b.tieOrder));
  return assignPlaces(sorted, byRules).map(({ row, place, unresolvedTie, decidedByAdmin }) => ({
    entryId: row.entryId,
    place,
    rankSum: row.rankSum,
    placements: row.placements,
    criterionTotals: row.criterionTotals,
    judges: row.judges,
    complete: row.complete,
    unresolvedTie,
    decidedByAdmin,
  }));
}

// Championship of a level: only participants who danced in every category of
// the level. Ordered by the sum of their final places, then by the majority of
// 1st, 2nd and 3rd places, then by the admin's decision.
export type CategoryPlaces = { categoryId: string; places: { participantId: string; place: number }[] };

export type ChampionRow = {
  participantId: string;
  placeSum: number;
  placements: [number, number, number];
  perCategory: { categoryId: string; place: number }[];
  place: number;
  unresolvedTie: boolean;
  decidedByAdmin: boolean;
};

type ChampionInput = {
  participantId: string;
  perCategory: { categoryId: string; place: number }[];
  placeSum: number;
  placements: [number, number, number];
  tieOrder: number | null;
};

export function rankChampionship(
  categories: CategoryPlaces[],
  decisions: { participantId: string; tieOrder: number }[] = [],
): ChampionRow[] {
  if (categories.length === 0) return [];
  const inAll = categories
    .map((c) => new Set(c.places.map((p) => p.participantId)))
    .reduce((acc, set) => new Set([...acc].filter((id) => set.has(id))));
  const tie = new Map(decisions.map((d) => [d.participantId, d.tieOrder]));

  const rows: ChampionInput[] = [...inAll].map((participantId) => {
    const perCategory = categories.map((c) => ({
      categoryId: c.categoryId,
      place: c.places.find((p) => p.participantId === participantId)!.place,
    }));
    const places = perCategory.map((p) => p.place);
    return {
      participantId,
      perCategory,
      placeSum: places.reduce((a, b) => a + b, 0),
      placements: countPlacements(places),
      tieOrder: tie.get(participantId) ?? null,
    };
  });
  const byRules = (a: ChampionInput, b: ChampionInput) =>
    a.placeSum - b.placeSum || compareDescending(a.placements, b.placements);

  const sorted = [...rows].sort((a, b) => byRules(a, b) || compareTieOrder(a.tieOrder, b.tieOrder));
  return assignPlaces(sorted, byRules).map(({ row, place, unresolvedTie, decidedByAdmin }) => ({
    participantId: row.participantId,
    placeSum: row.placeSum,
    placements: row.placements,
    perCategory: row.perCategory,
    place,
    unresolvedTie,
    decidedByAdmin,
  }));
}
