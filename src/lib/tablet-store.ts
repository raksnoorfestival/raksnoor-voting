// What a judge's tablet keeps in its own storage (localStorage): the scores
// still waiting to reach the server, and the ones already sent. Used by the
// score sheet and by the pages that send what other categories left behind.

// A score is "entryId|criterionId" -> value; null means cleared.
export type Values = Record<string, number | null>;

// Scores waiting to reach the server, kept on the tablet itself so a drop in
// the hall's wifi, a reload, a closed tab or an app update loses nothing.
// One per dancer and criterion: the last tap wins.
export const storeKey = (judgeId: string, categoryId: string) => `rn-pending:${judgeId}:${categoryId}`;
export function readPending(k: string): Values {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "{}") as Values;
  } catch {
    return {};
  }
}
export function writePending(k: string, p: Values) {
  try {
    if (Object.keys(p).length) localStorage.setItem(k, JSON.stringify(p));
    else localStorage.removeItem(k);
  } catch {
    // Storage blocked (private mode): the scores still go out while online.
  }
}

// Scores the server already has, with when they were sent (tablet clock).
// Only for when the page on screen is the tablet's copy (public/sw.js): the
// copy may be older than taps sent after it was kept, and those must still
// show. Kept a day, then dropped.
export type Sent = Record<string, { v: number | null; at: number }>;
export const sentKey = (judgeId: string, categoryId: string) => `rn-sent:${judgeId}:${categoryId}`;
const DAY = 24 * 60 * 60 * 1000;
export function readSent(k: string): Sent {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "{}") as Sent;
  } catch {
    return {};
  }
}
export function markSent(k: string, key: string, v: number | null) {
  try {
    const now = Date.now();
    const all = readSent(k);
    for (const [x, e] of Object.entries(all)) if (now - e.at > DAY) delete all[x];
    all[key] = { v, at: now };
    localStorage.setItem(k, JSON.stringify(all));
  } catch {}
}

// Answers that will not get better by trying again: the score leaves the
// queue and the judge is told. Anything else (no network, a server hiccup,
// an expired session) keeps it waiting.
export const FINAL = ["This category is closed.", "You are not on the panel of this category.", "Unknown entry.", "Unknown criterion."];
