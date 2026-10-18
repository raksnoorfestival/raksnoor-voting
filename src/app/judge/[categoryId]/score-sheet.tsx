"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { saveScore, submitSheet } from "@/actions/scores";
import { Button, Card, Notice } from "@/components/ui";

type Criterion = { id: string; name: string; maxPoints: number };
type Entry = { id: string; number: number; name: string; scores: Record<string, number> };

// A score is "entryId|criterionId" -> value; null means cleared.
type Values = Record<string, number | null>;

// Scores waiting to reach the server, kept on the tablet itself so a drop in
// the hall's wifi, a reload, a closed tab or an app update loses nothing.
// One per dancer and criterion: the last tap wins.
const storeKey = (judgeId: string, categoryId: string) => `rn-pending:${judgeId}:${categoryId}`;
function readPending(k: string): Values {
  try {
    return JSON.parse(localStorage.getItem(k) ?? "{}") as Values;
  } catch {
    return {};
  }
}
function writePending(k: string, p: Values) {
  try {
    if (Object.keys(p).length) localStorage.setItem(k, JSON.stringify(p));
    else localStorage.removeItem(k);
  } catch {
    // Storage blocked (private mode): the scores still go out while online.
  }
}

// Answers that will not get better by trying again: the score leaves the
// queue and the judge is told. Anything else (no network, a server hiccup,
// an expired session) keeps it waiting.
const FINAL = ["This category is closed.", "You are not on the panel of this category.", "Unknown entry.", "Unknown criterion."];

export function ScoreSheet({
  judgeId,
  categoryId,
  criteria,
  entries,
  readOnly,
  submitted: serverSubmitted,
}: {
  judgeId: string;
  categoryId: string;
  criteria: Criterion[];
  entries: Entry[];
  readOnly: boolean;
  submitted: boolean;
}) {
  const k = storeKey(judgeId, categoryId);
  const router = useRouter();
  // What this tablet has tapped since the page opened, sent or not. It sits
  // on top of what the server sends, so a refresh of the page (late dancer,
  // new running order) never takes a tapped score off the screen.
  const [local, setLocal] = useState<Values>({});
  const [pending, setPending] = useState<Values>({});
  const [offline, setOffline] = useState(false);
  const [sessionGone, setSessionGone] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(serverSubmitted);
  const [submitting, startSubmit] = useTransition();
  const pendingRef = useRef<Values>({});
  const flushing = useRef(false);
  // Refs, so the sending loop and the start-up effect do not change (and
  // re-run) every time the page refreshes its data.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const criteriaRef = useRef(criteria);
  criteriaRef.current = criteria;

  // The server is the truth about "submitted": adding a dancer after a
  // judge submitted clears it there, and this follows.
  useEffect(() => setSubmitted(serverSubmitted), [serverSubmitted]);

  const setQueue = useCallback(
    (p: Values) => {
      pendingRef.current = p;
      setPending(p);
      writePending(k, p);
    },
    [k],
  );

  // Send everything waiting, oldest first, including taps made while
  // sending. Stops at the first network failure and leaves the rest for the
  // next try. Every pass either clears an item or returns, so it cannot spin.
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      for (;;) {
        const next = Object.entries(pendingRef.current)[0];
        if (!next) break;
        const [key, v] = next;
        const [entryId, criterionId] = key.split("|");
        let r: Awaited<ReturnType<typeof saveScore>>;
        try {
          r = await saveScore(entryId, criterionId, v);
        } catch {
          setOffline(true);
          // Maybe not the network but an old page after a new build:
          // UpdateWatch checks at once and reloads if so (scores kept).
          window.dispatchEvent(new Event("rn-save-failed"));
          return;
        }
        setOffline(false);
        if (r.ok) {
          setSessionGone(false);
          setError(null);
        } else if (FINAL.includes(r.error)) {
          // A dancer taken out of the category is not news to the judge.
          const e = entriesRef.current.find((x) => x.id === entryId);
          const c = criteriaRef.current.find((x) => x.id === criterionId);
          if (e) setRejected((x) => [...x, `${e.number} ${e.name}, ${c?.name ?? "?"} (${r.error.replace(/.$/, "")})`]);
        } else {
          if (r.error.startsWith("Session expired")) setSessionGone(true);
          else setError(r.error);
          return;
        }
        const now = { ...pendingRef.current };
        if (now[key] === v) delete now[key];
        setQueue(now);
      }
    } finally {
      flushing.current = false;
    }
  }, [setQueue]);

  // On opening: whatever this tablet still holds goes on screen (it is newer
  // than the server's copy) and is sent.
  useEffect(() => {
    const saved = readPending(k);
    if (Object.keys(saved).length) {
      setLocal((l) => ({ ...l, ...saved }));
      setQueue(saved);
      flush();
    }
  }, [k, flush, setQueue]);

  // Keep trying while something is waiting: every few seconds, when the
  // browser says the network is back, and when the tablet wakes up.
  useEffect(() => {
    const retry = () => {
      if (Object.keys(pendingRef.current).length) flush();
    };
    const id = setInterval(retry, 5000);
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      clearInterval(id);
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [flush]);

  const value = (entryId: string, criterionId: string): number | undefined => {
    const key = `${entryId}|${criterionId}`;
    if (key in local) return local[key] ?? undefined;
    return entries.find((e) => e.id === entryId)?.scores[criterionId];
  };

  // Tapping the lit number again clears it.
  const tap = (entryId: string, criterionId: string, n: number) => {
    if (readOnly) return;
    const key = `${entryId}|${criterionId}`;
    const v = value(entryId, criterionId) === n ? null : n;
    setLocal((l) => ({ ...l, [key]: v }));
    setQueue({ ...pendingRef.current, [key]: v });
    flush();
  };

  const waiting = Object.keys(pending).length;
  const isWaiting = (entryId: string, criterionId: string) => `${entryId}|${criterionId}` in pending;
  const total = (entryId: string) => criteria.reduce((a, c) => a + (value(entryId, c.id) ?? 0), 0);
  const complete = (entryId: string) => criteria.every((c) => value(entryId, c.id) != null);
  const allComplete = entries.every((e) => complete(e.id));
  const missing = entries.filter((e) => !complete(e.id)).length;

  const submit = () => {
    startSubmit(async () => {
      try {
        const r = await submitSheet(categoryId);
        if (r.ok) {
          setSubmitted(true);
          // Ask the server again, so that "submitted" from now on is the
          // server's: if a late dancer is added, the server clears it and
          // the next refresh brings that here.
          router.refresh();
        } else setError(r.error);
      } catch {
        setOffline(true);
        setError("No connection. Your scores are safe on this tablet; press Submit again when the connection is back.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {(offline || waiting > 0) && (
        <div className="sticky top-2 z-20 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 shadow">
          {offline ? "No connection. " : "Sending… "}
          {waiting} score{waiting === 1 ? "" : "s"} kept on this tablet, sent automatically when the connection is back. Keep scoring.
        </div>
      )}
      {sessionGone && (
        <Notice kind="warn">
          Your session has expired. <a href="/judge/login" className="underline">Sign in again</a> on this tablet: the {waiting} waiting score{waiting === 1 ? "" : "s"} stay here and are sent after you sign in.
        </Notice>
      )}
      {rejected.length > 0 && <Notice kind="error">These scores were not saved: {rejected.join("; ")}. Tell the organisation.</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {entries.length === 0 && <Card className="text-sm text-neutral-600">No participants in this category yet.</Card>}
      {entries.map((e) => (
        <Card key={e.id} className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-ink px-2 text-base font-bold text-white">{e.number}</span>
              <span className="text-lg font-bold">{e.name}</span>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Total</div>
              <div className={`text-xl font-bold ${complete(e.id) ? "text-ink" : "text-neutral-400"}`}>{total(e.id)}</div>
            </div>
          </div>
          <div className="space-y-3">
            {criteria.map((c) => {
              const v = value(e.id, c.id);
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-sm font-medium">
                    <span>{c.name}</span>
                    <span className="text-xs text-neutral-400">{isWaiting(e.id, c.id) ? (offline ? "kept on tablet" : "sending") : ""}</span>
                  </div>
                  <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${c.maxPoints}, minmax(0, 1fr))` }}>
                    {Array.from({ length: c.maxPoints }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="score-btn"
                        data-on={v === n}
                        disabled={readOnly}
                        onClick={() => tap(e.id, c.id, n)}
                        aria-label={`${c.name} ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      {!readOnly && entries.length > 0 && (
        <Card className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {waiting > 0 ? (
              <span className="text-amber-900">
                Waiting to send {waiting} score{waiting === 1 ? "" : "s"}; you can submit once they are through.
              </span>
            ) : submitted ? (
              <span className="font-semibold text-green-700">Submitted. You can still change a score until the category is closed.</span>
            ) : allComplete ? (
              <span>All participants scored. Submit when you are done.</span>
            ) : (
              <span className="text-neutral-600">
                {missing} participant{missing === 1 ? "" : "s"} still without all scores. Tap a lit number again to clear it.
              </span>
            )}
          </div>
          <Button onClick={submit} disabled={submitting || !allComplete || submitted || waiting > 0}>
            {submitted ? "Submitted" : "Submit my scores"}
          </Button>
        </Card>
      )}
    </div>
  );
}
