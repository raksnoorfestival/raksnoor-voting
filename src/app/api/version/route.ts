import { appVersion } from "@/lib/version";

export const dynamic = "force-dynamic";

// Which build is on the server right now. Kept for pages opened before
// 15 October 2026, which still ask here; newer pages read /version.json
// (scripts/write-version.mjs), which costs no function call.
export function GET() {
  return Response.json({ version: appVersion() }, { headers: { "Cache-Control": "no-store" } });
}
