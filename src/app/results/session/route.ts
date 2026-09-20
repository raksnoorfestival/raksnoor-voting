import { currentEvent } from "@/lib/event";
import { guarded } from "@/lib/login-guard";
import { setSession } from "@/lib/session";

// The public results sign-in, as a plain HTML form post rather than a
// server action. A server action that sets a cookie makes Next re-render
// the page and stream the whole results page inside the button's reply;
// Safari on iPhone closed that connection and showed a blank screen
// (20 September 2026). Here the browser gets a 303 and opens /results as
// an ordinary page, which works everywhere, even without JavaScript.
export async function POST(req: Request) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "").trim();
  // Relative Locations on purpose: the host the function sees is not
  // always the host the visitor typed.
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });
  const back = (msg: string) => go(`/results/login?error=${encodeURIComponent(msg)}`);

  const event = await currentEvent();
  if (!event) return back("There is no current event.");
  if (!event.publicPassword) return back("Results are not open yet.");
  const error = await guarded("public", "results", async () => password === event.publicPassword, "Wrong password.");
  if (error) return back(error);
  await setSession({ role: "public", eventId: event.id });
  return go("/results");
}
