import { pageStamp } from "@/lib/stamp-server";
import { parseStampRequest } from "@/lib/stamp";

export const dynamic = "force-dynamic";

// The same answer as netlify/edge-functions/stamp.ts. On Netlify the edge
// answers and this only runs if it fails; in development this answers.
export async function GET(req: Request) {
  const ask = parseStampRequest(req.url);
  if (!ask) return Response.json({ error: "missing" }, { status: 400 });
  return Response.json({ stamp: await pageStamp(ask.watch, ask.scores) }, { headers: { "cache-control": "no-store", "x-stamp-source": "next" } });
}
