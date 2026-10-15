// "Has anything changed on this page?", asked every few seconds by every
// open page (see src/lib/stamp.ts). Here, at the edge, so the asking does
// not spend the 125,000 normal function calls a month of the free plan.
// If this fails, `onError: "bypass"` hands the request to the Next route
// at the same address (src/app/api/stamp/route.ts).
import { neon } from "@neondatabase/serverless";
import { parseStampRequest, stampQuery } from "../../src/lib/stamp.ts";

declare const Netlify: { env: { get(name: string): string | undefined } };

const stamp = async (req: Request) => {
  const ask = parseStampRequest(req.url);
  if (!ask) return Response.json({ error: "missing" }, { status: 400 });
  const url = Netlify.env.get("DATABASE_URL");
  if (!url) throw new Error("DATABASE_URL is not set for edge functions");
  const [sql, id] = stampQuery(ask.watch);
  const rows = (await neon(url).query(sql, [id, ask.scores])) as { stamp: string }[];
  return Response.json({ stamp: rows[0]?.stamp ?? "" }, { headers: { "cache-control": "no-store", "x-stamp-source": "edge" } });
};

export default stamp;

export const config = { path: "/api/stamp", onError: "bypass" };
