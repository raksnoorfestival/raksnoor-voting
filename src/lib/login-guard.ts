import { headers } from "next/headers";
import { db } from "@/lib/db";
import { afterFailure, lockMessage, secondsLocked } from "@/lib/throttle";

// Who is trying: the connecting address plus what they typed, so one judge
// mistyping on the festival wifi does not lock the judge beside them.
async function keyFor(kind: string, who: string) {
  const h = await headers();
  const ip = h.get("x-nf-client-connection-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  return `${kind}|${ip}|${who.toLowerCase()}`;
}

/** Returns an error message while locked, otherwise null. */
export async function checkLoginAllowed(kind: string, who: string): Promise<string | null> {
  const key = await keyFor(kind, who);
  const a = await db.loginAttempt.findUnique({ where: { key } });
  const wait = secondsLocked(a, new Date());
  return wait > 0 ? lockMessage(wait) : null;
}

export async function recordLoginFailure(kind: string, who: string): Promise<string> {
  const key = await keyFor(kind, who);
  const a = await db.loginAttempt.findUnique({ where: { key } });
  const next = afterFailure(a, new Date());
  await db.loginAttempt.upsert({
    where: { key },
    create: { key, failures: next.failures, lockedUntil: next.lockedUntil },
    update: { failures: next.failures, lockedUntil: next.lockedUntil },
  });
  const wait = secondsLocked(next, new Date());
  return wait > 0 ? lockMessage(wait) : "";
}

export async function recordLoginSuccess(kind: string, who: string) {
  const key = await keyFor(kind, who);
  await db.loginAttempt.deleteMany({ where: { key } });
}

// Every sign-in goes through the same three steps: refuse while locked,
// count a wrong try, forget the count on a right one. Returns the message
// to show, or null when the visitor is in.
export async function guarded(kind: string, who: string, verify: () => Promise<boolean>, wrong: string): Promise<string | null> {
  const locked = await checkLoginAllowed(kind, who);
  if (locked) return locked;
  if (!(await verify())) {
    const nowLocked = await recordLoginFailure(kind, who);
    return nowLocked || wrong;
  }
  await recordLoginSuccess(kind, who);
  return null;
}
