"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { stampUrl, type StampScores, type StampWatch } from "@/lib/stamp";

// Keeps an open page up to date. Every `seconds` it asks the edge whether
// what the page shows has changed (src/lib/stamp.ts), and only then
// re-fetches the page's data, without a full reload. Asking is nearly free;
// re-fetching is one of the free plan's 125,000 function calls a month, so
// it happens when there is something new and not on a timer.
//
// Never while someone is writing in a field: a refresh on top of a
// half-typed name is how work gets lost. And only with a connection:
// without one, a refresh can make the browser leave the app for its own
// "no internet" page (the festival hall's wifi drops). A question with no
// answer within a few seconds just skips this round.
//
// If the edge is down, Netlify sends the question to the normal function
// instead (it answers with x-stamp-source: next). Then each question costs
// a call too, so this page asks once a minute until the edge is back.
async function liveStamp(url: string): Promise<{ stamp: string; edge: boolean } | null> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!r.ok) return null;
    const { stamp } = (await r.json()) as { stamp?: string };
    return typeof stamp === "string" ? { stamp, edge: r.headers.get("x-stamp-source") !== "next" } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function AutoRefresh({ seconds, watch, scores, stamp }: { seconds: number; watch: StampWatch; scores: StampScores; stamp: string }) {
  const router = useRouter();
  const url = stampUrl(watch, scores);
  // The fingerprint of what is on screen, from the server render; a refresh
  // brings the new one.
  const shown = useRef(stamp);
  useEffect(() => {
    shown.current = stamp;
  }, [stamp]);
  // The last fingerprint a refresh was asked for. If, after it, the page
  // still says something else (a refresh lost to the network), it is asked
  // again at most once a minute instead of on every round.
  const asked = useRef({ stamp: "", at: 0 });
  // When the last answer did not come from the edge: the next question waits.
  const slowUntil = useRef(0);

  useEffect(() => {
    const id = setInterval(async () => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (typing || document.visibilityState !== "visible" || Date.now() < slowUntil.current) return;
      const answer = await liveStamp(url);
      if (answer === null) return;
      slowUntil.current = answer.edge ? 0 : Date.now() + 60_000;
      const live = answer.stamp;
      if (live === shown.current) return;
      if (live === asked.current.stamp && Date.now() - asked.current.at < 60_000) return;
      asked.current = { stamp: live, at: Date.now() };
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds, url]);
  return null;
}
