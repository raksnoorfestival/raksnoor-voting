// "Has anything changed?" in one short answer: a fingerprint (md5) of what a
// page shows. Open pages ask for it every few seconds and only reload their
// data when it changes. The asking goes through a Netlify edge function
// (netlify/edge-functions/stamp.ts), which has its own allowance of a
// million calls a month; reloading the page itself is a normal function
// call, and those are 125,000 a month for the whole app on the free plan.
// Before this (15 October 2026) every open judge tablet reloaded its page
// every 15 seconds whether anything had changed or not.
//
// Times go in as numbers (epoch), not text: the edge and Prisma talk to the
// database over different connections, and text dates follow connection
// settings. Both must print the same fingerprint for the same data.
//
// No imports: the edge function runs this file as it is.

// $1 is the event id; $2 says which scores count: 0 none, 1 all, 2 only
// those of categories whose results are public. Judges leave them out:
// their own taps live on the tablet (ScoreSheet), and another judge's taps
// change nothing on their screen. The public results only follow what they
// can see, so a phone in the audience does not reload on every judge's tap.
export const EVENT_STAMP_SQL = `
select md5(concat_ws('|',
  (select concat_ws(':', ev.name, ev."publicPassword", ev."isCurrent") from "Event" ev where ev.id = $1),
  (select string_agg(concat_ws(':', l.id, l.name, l."sortOrder", l."hasChampionship"), ',' order by l.id) from "Level" l where l."eventId" = $1),
  (select string_agg(concat_ws(':', c.id, c."levelId", c.name, c."sortOrder", c.status, c."resultsVisible", c."countsForChampionship"), ',' order by c.id) from "Category" c where c."eventId" = $1),
  (select string_agg(concat_ws(':', e.id, e.number, e."tieOrder", p.name), ',' order by e.id)
     from "Entry" e join "Category" c on c.id = e."categoryId" join "Participant" p on p.id = e."participantId" where c."eventId" = $1),
  (select string_agg(concat_ws(':', s.id, extract(epoch from s."submittedAt")), ',' order by s.id)
     from "JudgeSheet" s join "Category" c on c.id = s."categoryId" where c."eventId" = $1),
  (select string_agg(concat_ws(':', j.id, j.name, j.active, j."allCategories"), ',' order by j.id) from "Judge" j where j."eventId" = $1),
  (select string_agg(concat_ws(':', jc."judgeId", jc."categoryId"), ',' order by jc."judgeId", jc."categoryId")
     from "JudgeCategory" jc join "Judge" j on j.id = jc."judgeId" where j."eventId" = $1),
  (select string_agg(concat_ws(':', d.id, d."tieOrder"), ',' order by d.id)
     from "ChampionshipDecision" d join "Level" l on l.id = d."levelId" where l."eventId" = $1),
  case when $2::int > 0 then
    (select concat_ws(':', count(*), extract(epoch from max(sc."updatedAt")), sum(sc.value))
       from "Score" sc join "Entry" e on e.id = sc."entryId" join "Category" c on c.id = e."categoryId"
       where c."eventId" = $1 and ($2::int = 1 or c."resultsVisible"))
  end
)) as stamp`;

// $1 is the category id; $2 as above.
export const CATEGORY_STAMP_SQL = `
select md5(concat_ws('|',
  (select concat_ws(':', c.name, c."sortOrder", c.status, c."resultsVisible", c."countsForChampionship") from "Category" c where c.id = $1),
  (select string_agg(concat_ws(':', e.id, e.number, e."tieOrder", p.name), ',' order by e.id)
     from "Entry" e join "Participant" p on p.id = e."participantId" where e."categoryId" = $1),
  (select string_agg(concat_ws(':', s.id, extract(epoch from s."submittedAt")), ',' order by s.id) from "JudgeSheet" s where s."categoryId" = $1),
  (select string_agg(concat_ws(':', j.id, j.name, j.active, j."allCategories"), ',' order by j.id)
     from "Judge" j join "Category" c on c."eventId" = j."eventId" where c.id = $1),
  (select string_agg(jc."judgeId", ',' order by jc."judgeId") from "JudgeCategory" jc where jc."categoryId" = $1),
  case when $2::int > 0 then
    (select concat_ws(':', count(*), extract(epoch from max(sc."updatedAt")), sum(sc.value))
       from "Score" sc join "Entry" e on e.id = sc."entryId" join "Category" c on c.id = e."categoryId"
       where e."categoryId" = $1 and ($2::int = 1 or c."resultsVisible"))
  end
)) as stamp`;

export type StampWatch = { event: string } | { category: string };
export type StampScores = "none" | "all" | "public";
const SCORES: Record<StampScores, number> = { none: 0, all: 1, public: 2 };

export function stampQuery(w: StampWatch): [string, string] {
  return "category" in w ? [CATEGORY_STAMP_SQL, w.category] : [EVENT_STAMP_SQL, w.event];
}

export function stampUrl(w: StampWatch, scores: StampScores) {
  const q = "category" in w ? `c=${encodeURIComponent(w.category)}` : `e=${encodeURIComponent(w.event)}`;
  return `/api/stamp?${q}&s=${SCORES[scores]}`;
}

// Reads the request the same way in the edge function and the Next route.
export function parseStampRequest(url: string): { watch: StampWatch; scores: number } | null {
  const p = new URL(url).searchParams;
  const c = p.get("c");
  const e = p.get("e");
  const scores = [0, 1, 2].includes(Number(p.get("s"))) ? Number(p.get("s")) : 0;
  if (c) return { watch: { category: c }, scores };
  if (e) return { watch: { event: e }, scores };
  return null;
}
