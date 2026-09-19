// The 2025 festival, scored on paper and typed into the spreadsheet, is the
// test data. Every case below is one the spreadsheet got wrong, or one the
// spreadsheet could not express.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rankEntries, rankChampionship, explainTie, type Score } from "../src/lib/ranking.ts";

type Fixture = {
  criteria: string[];
  categories: { sheet: string; level: string; name: string; judges: string[]; entries: { number: number; name: string; scores: (number | null)[][] }[]; published: string[] }[];
};
const festival: Fixture = JSON.parse(readFileSync(new URL("./fixtures/festival-2025.json", import.meta.url), "utf8"));

const criteria = festival.criteria.map((name, i) => ({ id: name, priority: i + 1 }));
const judges = [0, 1, 2, 3, 4].map((i) => ({ id: `judge${i}` }));

function category(sheet: string) {
  const cat = festival.categories.find((c) => c.sheet === sheet);
  if (!cat) throw new Error(`No sheet ${sheet}`);
  const entries = cat.entries.map((e) => ({ id: e.name }));
  const scores: Score[] = [];
  cat.entries.forEach((e) =>
    e.scores.forEach((byJudge, ji) =>
      byJudge.forEach((v, ci) => {
        if (v !== null) scores.push({ entryId: e.name, judgeId: judges[ji].id, criterionId: criteria[ci].id, value: v });
      }),
    ),
  );
  return { cat, entries, scores };
}

function order(sheet: string) {
  const { entries, scores } = category(sheet);
  return rankEntries(entries, judges, criteria, scores);
}

test("A category with no ties comes out exactly as the spreadsheet published it", () => {
  const { cat } = category("A.Baladi");
  const names = order("A.Baladi").map((r) => r.entryId);
  assert.deepEqual(names, cat.published);
});

test("The tie-breaker rewards first places instead of punishing them (AD.Improv, 2025)", () => {
  // Kateryna and Amanda both sum 9. Kateryna has three 1st places, Amanda two.
  // The spreadsheet gave the category to Amanda.
  const r = order("AD.Improv");
  assert.equal(r[0].entryId, "Kateryna Repetska");
  assert.deepEqual(r[0].placements, [3, 0, 2]);
  assert.equal(r[1].entryId, "Amanda Engel");
  assert.deepEqual(r[1].placements, [2, 2, 1]);
  assert.equal(r[0].place, 1);
  assert.equal(r[1].place, 2);
  assert.ok(!r[0].unresolvedTie && !r[1].unresolvedTie);
});

test("Every dancer is ranked, however many there are (A.Oriental had 11 and the sheet stopped at 8)", () => {
  const r = order("A.Oriental");
  assert.equal(r.length, 11);
  // Itaf summed 26, less than Adela (27), and was published 11th.
  const itaf = r.find((x) => x.entryId === "Itaf Ghebantani")!;
  assert.equal(itaf.rankSum, 26);
  assert.equal(itaf.place, 6);
  assert.deepEqual(
    r.map((x) => x.place),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  );
});

test("Judges' ranks share the position on equal points, like RANK in Excel", () => {
  const { cat } = category("M.Improv");
  const r = order("M.Improv");
  const daryna = r.find((x) => x.entryId === "Daryna Ilchyshena")!;
  // Judge totals are visible per judge, so the panel can show them.
  assert.equal(daryna.judges.length, 5);
  assert.ok(daryna.judges.every((j) => j.complete));
  assert.equal(cat.entries.length, r.length);
});

test("A tie the rules cannot break is flagged, shares the place, and yields to the admin's decision", () => {
  // Daryna and Yana: same rank sum, same 1st/2nd/3rd, and every criterion
  // total equal too. Build that from the real M.Improv scores by making them
  // identical, so only the admin can separate them.
  const { entries, scores } = category("M.Improv");
  const yanaScores = scores.filter((s) => s.entryId === "Yana Holka");
  const cloned = scores
    .filter((s) => s.entryId !== "Daryna Ilchyshena")
    .concat(yanaScores.map((s) => ({ ...s, entryId: "Daryna Ilchyshena" })));

  const open = rankEntries(entries, judges, criteria, cloned);
  const d = open.find((x) => x.entryId === "Daryna Ilchyshena")!;
  const y = open.find((x) => x.entryId === "Yana Holka")!;
  assert.ok(d.unresolvedTie && y.unresolvedTie);
  assert.equal(d.place, y.place);
  assert.equal(d.place, 1);
  // The next dancer is 3rd, not 2nd: two share first place.
  const third = open.find((x) => !x.unresolvedTie)!;
  assert.equal(third.place, 3);

  const decided = rankEntries(
    entries.map((e) => (e.id === "Yana Holka" ? { ...e, tieOrder: 1 } : e.id === "Daryna Ilchyshena" ? { ...e, tieOrder: 2 } : e)),
    judges,
    criteria,
    cloned,
  );
  assert.equal(decided[0].entryId, "Yana Holka");
  assert.equal(decided[0].place, 1);
  assert.ok(decided[0].decidedByAdmin);
  assert.equal(decided[1].entryId, "Daryna Ilchyshena");
  assert.equal(decided[1].place, 2);
  assert.ok(!decided[1].unresolvedTie);
});

test("When placements tie, the criteria decide in priority order", () => {
  // Two dancers, one judge, same total: 8+8 against 9+7. The first criterion
  // (Technique) is worth more than the second by priority, so 9+7 wins.
  const two = [{ id: "a" }, { id: "b" }];
  const oneJudge = [{ id: "j" }];
  const twoCriteria = [
    { id: "Technique", priority: 1 },
    { id: "Image", priority: 2 },
  ];
  const scores: Score[] = [
    { entryId: "a", judgeId: "j", criterionId: "Technique", value: 8 },
    { entryId: "a", judgeId: "j", criterionId: "Image", value: 8 },
    { entryId: "b", judgeId: "j", criterionId: "Technique", value: 9 },
    { entryId: "b", judgeId: "j", criterionId: "Image", value: 7 },
  ];
  const r = rankEntries(two, oneJudge, twoCriteria, scores);
  assert.equal(r[0].entryId, "b");
  assert.ok(!r[0].unresolvedTie);
  // Swap the priority and the result swaps with it.
  const swapped = rankEntries(two, oneJudge, [{ id: "Technique", priority: 2 }, { id: "Image", priority: 1 }], scores);
  assert.equal(swapped[0].entryId, "a");
});

test("A judge who has not finished leaves the entry marked incomplete, and the ranking still runs", () => {
  const { entries, scores } = category("A.Baladi");
  const missing = scores.filter((s) => !(s.entryId === "Adela Gómez" && s.judgeId === "judge4" && s.criterionId === "Image"));
  const r = rankEntries(entries, judges, criteria, missing);
  const adela = r.find((x) => x.entryId === "Adela Gómez")!;
  assert.equal(adela.complete, false);
  assert.equal(adela.judges[4].byCriterion[4], null);
  assert.ok(r.filter((x) => x.entryId !== "Adela Gómez").every((x) => x.complete));
});

test("The Master champion is the sum of final places over every category of the level", () => {
  const master = festival.categories.filter((c) => c.level === "Master" && c.name !== "Live Band");
  const places = master.map((c) => ({
    categoryId: c.name,
    places: order(c.sheet).map((r) => ({ participantId: r.entryId, place: r.place })),
  }));
  const r = rankChampionship(places);
  // Only the five who danced all five categories; Anandi and Ingridi did not.
  assert.equal(r.length, 5);
  assert.ok(!r.some((x) => x.participantId === "Master Anandi Christavé"));
  // With the tie-breaker the right way round, Yana wins Folklore and takes the
  // championship outright: 8 against Daryna's 11.
  assert.equal(r[0].participantId, "Yana Holka");
  assert.equal(r[0].placeSum, 8);
  assert.ok(!r[0].unresolvedTie);
});

test("Only who competed in every category of the level is eligible for the championship", () => {
  const r = rankChampionship([
    { categoryId: "Baladi", places: [{ participantId: "Anna", place: 2 }, { participantId: "Joana", place: 1 }] },
    { categoryId: "Oriental", places: [{ participantId: "Anna", place: 1 }] },
  ]);
  assert.deepEqual(r.map((x) => x.participantId), ["Anna"]);
});

test("A championship tie flags both, and the admin's decision settles it", () => {
  const cats = [
    { categoryId: "x", places: [{ participantId: "A", place: 1 }, { participantId: "B", place: 2 }] },
    { categoryId: "y", places: [{ participantId: "A", place: 2 }, { participantId: "B", place: 1 }] },
  ];
  const open = rankChampionship(cats);
  assert.ok(open.every((x) => x.unresolvedTie && x.place === 1));
  const decided = rankChampionship(cats, [{ participantId: "B", tieOrder: 1 }, { participantId: "A", tieOrder: 2 }]);
  assert.equal(decided[0].participantId, "B");
  assert.ok(decided[0].decidedByAdmin);
  assert.equal(decided[1].place, 2);
});

test("A tie on the sum of ranks is explained by the first step that separates the two", () => {
  // Yana and Daryna in Master Improvisation: 8 and 8, same 1st/2nd/3rd,
  // same Technique, Choreo and Stage Presence; Originality 40 against 38.
  const r = order("M.Improv");
  const yana = r.find((x) => x.entryId === "Yana Holka")!;
  const daryna = r.find((x) => x.entryId === "Daryna Ilchyshena")!;
  const why = explainTie(yana, daryna, festival.criteria)!;
  assert.deepEqual(why.same, ["1st places", "2nd places", "3rd places", "Technique", "Choreo & Musicality", "Stage Presence"]);
  assert.deepEqual(why.decidedBy, { label: "Originality", a: 40, b: 38 });
  assert.equal(why.byAdmin, false);
  // The same pair the other way round reads the other way round.
  assert.deepEqual(explainTie(daryna, yana, festival.criteria)!.decidedBy, { label: "Originality", a: 38, b: 40 });
  // No tie on the sum, nothing to explain.
  const sara = r.find((x) => x.entryId === "Sara Olianas")!;
  assert.equal(explainTie(yana, sara, festival.criteria), null);
  // Placements come before criteria: 2 firsts against 1 decides even when a
  // criterion would say the opposite.
  const byPlaces = explainTie(
    { rankSum: 6, placements: [2, 0, 1], criterionTotals: [30, 30], decidedByAdmin: false },
    { rankSum: 6, placements: [1, 2, 0], criterionTotals: [40, 30], decidedByAdmin: false },
    ["Technique", "Image"],
  )!;
  assert.deepEqual(byPlaces.decidedBy, { label: "1st places", a: 2, b: 1 });
  assert.deepEqual(byPlaces.same, []);
  // Nothing separates them: the jury.
  const jury = explainTie(
    { rankSum: 6, placements: [1, 1, 1], criterionTotals: [30], decidedByAdmin: true },
    { rankSum: 6, placements: [1, 1, 1], criterionTotals: [30], decidedByAdmin: true },
    ["Technique"],
  )!;
  assert.equal(jury.decidedBy, null);
  assert.equal(jury.byAdmin, true);
});
