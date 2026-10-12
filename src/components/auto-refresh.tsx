"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetches the page's server data every `seconds`, without a full reload
// and never while someone is writing in a field: a refresh on top of a
// half-typed name is how work gets lost.
//
// Only with a connection: without one, a refresh can make the browser leave
// the app for its own "no internet" page (the festival hall's wifi drops).
// A quick look at /api/version tells whether the server answers; if it does
// not within a few seconds, this round is skipped.
async function serverAnswers(): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch("/api/version", { cache: "no-store", signal: ctrl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(async () => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (typing || document.visibilityState !== "visible") return;
      if (await serverAnswers()) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
