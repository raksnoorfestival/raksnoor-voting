import { db } from "@/lib/db";
import { stampQuery, type StampScores, type StampWatch } from "@/lib/stamp";

// The page's own fingerprint, worked out while rendering it, so the page
// knows from the start which state it is showing (see AutoRefresh).
export async function pageStamp(watch: StampWatch, scores: StampScores | number): Promise<string> {
  const [sql, id] = stampQuery(watch);
  const n = typeof scores === "number" ? scores : { none: 0, all: 1, public: 2 }[scores];
  const rows = await db.$queryRawUnsafe<{ stamp: string | null }[]>(sql, id, n);
  return rows[0]?.stamp ?? "";
}
