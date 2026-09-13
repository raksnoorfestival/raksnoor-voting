import { redirect } from "next/navigation";
import { getAdmin, getPublic } from "@/lib/session";
import { currentEvent } from "@/lib/event";

// Who may open the public results: someone who typed the password for the
// current event, or a signed-in admin.
export async function requirePublicAccess() {
  const event = await currentEvent();
  if (!event) redirect("/");
  const [pub, admin] = await Promise.all([getPublic(), getAdmin()]);
  if (admin) return { event, isAdmin: true };
  if (pub && pub.eventId === event.id) return { event, isAdmin: false };
  redirect("/results/login");
}
