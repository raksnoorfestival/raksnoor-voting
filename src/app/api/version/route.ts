import { appVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

// Which build is on the server right now. The pages ask this every minute
// and reload themselves when the answer changes (see UpdateWatch).
export function GET() {
  return Response.json({ version: appVersion() }, { headers: { "Cache-Control": "no-store" } });
}
