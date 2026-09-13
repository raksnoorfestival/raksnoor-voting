// Slows down password guessing. Five wrong tries lock the door for 30
// seconds; every five more double the wait, up to 10 minutes; one right try
// clears everything. Pure rule here, database wrapper below, so the rule can
// be tested without a database.

export const FREE_TRIES = 5;
export const FIRST_LOCK_SECONDS = 30;
export const MAX_LOCK_SECONDS = 10 * 60;

export type Attempt = { failures: number; lockedUntil: Date | null };

export function lockAfter(failures: number): number {
  if (failures < FREE_TRIES) return 0;
  const steps = Math.floor(failures / FREE_TRIES) - 1;
  return Math.min(FIRST_LOCK_SECONDS * 2 ** steps, MAX_LOCK_SECONDS);
}

/** Seconds still to wait, or 0 when a try is allowed. */
export function secondsLocked(a: Attempt | null, now: Date): number {
  if (!a?.lockedUntil) return 0;
  return Math.max(0, Math.ceil((a.lockedUntil.getTime() - now.getTime()) / 1000));
}

export function afterFailure(a: Attempt | null, now: Date): Attempt {
  const failures = (a?.failures ?? 0) + 1;
  const lock = lockAfter(failures);
  // Only every FREE_TRIES-th failure starts a new lock; the ones in between
  // keep counting.
  const startsLock = lock > 0 && failures % FREE_TRIES === 0;
  return { failures, lockedUntil: startsLock ? new Date(now.getTime() + lock * 1000) : a?.lockedUntil ?? null };
}

export function lockMessage(seconds: number): string {
  if (seconds >= 120) return `Too many wrong tries. Wait ${Math.ceil(seconds / 60)} minutes.`;
  return `Too many wrong tries. Wait ${seconds} seconds.`;
}
