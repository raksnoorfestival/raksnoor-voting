"use client";

import { useEffect, useState } from "react";
import { saveScore } from "@/actions/scores";
import { FINAL, markSent, readPending, sentKey, storeKey, writePending } from "@/lib/tablet-store";

// The judge's side keeps copies of its pages on the tablet (public/sw.js),
// so a drop in the hall's wifi never stops the scoring.

// When the page on screen is the tablet's copy and not the server's answer:
// the time it was kept (ms), or null.
export function offlineCopyAt(): number | null {
  if (typeof document === "undefined") return null;
  const at = Number(document.querySelector('meta[name="rn-offline-copy"]')?.getAttribute("content"));
  return at > 0 ? at : null;
}

// Starts the keeper and asks it to keep these pages now, while there is a
// connection: the judge's list and her open categories. Only in a published
// build: in development the code files change under the same names.
//
// It also sends what other categories left waiting: a judge who scored
// without connection and moved on must not have to open that category
// again for its scores to go. The category on screen is left to its own
// score sheet (`except`), so the same score is never sent from two places.
export function KeepOffline({ paths, judgeId, except }: { paths: string[]; judgeId: string; except?: string }) {
  useEffect(() => {
    let busy = false;
    const send = async () => {
      if (busy) return;
      busy = true;
      try {
        await sendWaiting(judgeId, except);
      } finally {
        busy = false;
      }
    };
    send();
    const id = setInterval(send, 15_000);
    window.addEventListener("online", send);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", send);
    };
  }, [judgeId, except]);

  const list = paths.join("\n");
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    if (offlineCopyAt()) return;
    let gone = false;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/judge" })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        if (!gone) reg.active?.postMessage({ type: "keep", paths: list.split("\n").filter(Boolean) });
      })
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [list]);
  return <CopyNotice />;
}

// Every queue of this judge on this tablet but the one in `except`, one score
// at a time; stops at the first failure that is not final (no network, an
// expired session) and tries again later.
async function sendWaiting(judgeId: string, except?: string) {
  let keys: string[] = [];
  try {
    const prefix = storeKey(judgeId, "");
    keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix) && k !== storeKey(judgeId, except ?? ""));
  } catch {
    return;
  }
  for (const k of keys) {
    const categoryId = k.slice(storeKey(judgeId, "").length);
    for (const [key, v] of Object.entries(readPending(k))) {
      const [entryId, criterionId] = key.split("|");
      let r: Awaited<ReturnType<typeof saveScore>>;
      try {
        r = await saveScore(entryId, criterionId, v);
      } catch {
        return;
      }
      if (!r.ok && !FINAL.includes(r.error)) return;
      if (r.ok) markSent(sentKey(judgeId, categoryId), key, v);
      // Taken off only if no newer tap replaced it in the meantime.
      const now = readPending(k);
      if (now[key] === v) {
        delete now[key];
        writePending(k, now);
      }
    }
  }
}

// On a copy: says so, and as soon as the connection is back, opens the
// server's page instead. Scores waiting on the tablet are kept across the
// reload and sent as the page opens (score-sheet.tsx).
function CopyNotice() {
  const [at, setAt] = useState<number | null>(null);
  useEffect(() => setAt(offlineCopyAt()), []);
  useEffect(() => {
    if (!at) return;
    let busy = false;
    const back = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const r = await fetch("/version.json", { cache: "no-store" });
        if (r.ok) window.location.reload();
      } catch {
        // Still offline.
      } finally {
        busy = false;
      }
    };
    const id = setInterval(back, 10_000);
    window.addEventListener("online", back);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", back);
    };
  }, [at]);
  if (!at) return null;
  const time = new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="sticky top-2 z-30 mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 shadow">
      No connection: this is the copy of this page saved on the tablet at {time}. Keep scoring; everything is sent when the connection is back.
    </div>
  );
}

// On the sign-in page: the copies of the last judge's pages go, so a shared
// tablet never shows them to the next one. Scores still waiting to be sent
// are kept elsewhere and are not touched.
export function ForgetCopies() {
  useEffect(() => {
    if (!("caches" in window)) return;
    caches.delete("rn-judge-pages-v1").catch(() => {});
  }, []);
  return null;
}
