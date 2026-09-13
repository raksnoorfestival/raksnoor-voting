import { db } from "@/lib/db";

// The event the judges and the public see. There is exactly one current
// event at a time; the admin switches it.
export async function currentEvent() {
  return db.event.findFirst({ where: { isCurrent: true } });
}

export async function requireCurrentEvent() {
  const e = await currentEvent();
  if (!e) throw new Error("No current event. Create one in Admin, Events.");
  return e;
}
