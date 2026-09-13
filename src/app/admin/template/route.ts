import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/session";
import { participantsTemplate } from "@/lib/excel";

export async function GET() {
  if (!(await getAdmin())) return new NextResponse("Sign in first", { status: 401 });
  const buf = participantsTemplate();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="participants-template.xlsx"',
    },
  });
}
