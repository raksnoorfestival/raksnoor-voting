"use client";

import { useState, useTransition } from "react";
import { saveScore, submitSheet } from "@/actions/scores";
import { Button, Card, Notice } from "@/components/ui";

type Criterion = { id: string; name: string; maxPoints: number };
type Entry = { id: string; number: number; name: string; scores: Record<string, number> };

export function ScoreSheet({
  categoryId,
  criteria,
  entries,
  readOnly,
  submitted: initialSubmitted,
}: {
  categoryId: string;
  criteria: Criterion[];
  entries: Entry[];
  readOnly: boolean;
  submitted: boolean;
}) {
  const [scores, setScores] = useState<Record<string, Record<string, number>>>(
    Object.fromEntries(entries.map((e) => [e.id, { ...e.scores }])),
  );
  const [saving, setSaving] = useState<Record<string, "saving" | "saved" | "error">>({});
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [pending, startTransition] = useTransition();

  const key = (entryId: string, criterionId: string) => `${entryId}|${criterionId}`;

  const tap = (entryId: string, criterionId: string, value: number) => {
    if (readOnly) return;
    const before = scores[entryId]?.[criterionId];
    setScores((s) => ({ ...s, [entryId]: { ...s[entryId], [criterionId]: value } }));
    setSaving((s) => ({ ...s, [key(entryId, criterionId)]: "saving" }));
    startTransition(async () => {
      const r = await saveScore(entryId, criterionId, value);
      if (r.ok) {
        setSaving((s) => ({ ...s, [key(entryId, criterionId)]: "saved" }));
        setError(null);
      } else {
        // Put the old value back so the screen never shows a score the
        // server does not have.
        setScores((s) => {
          const next = { ...s[entryId] };
          if (before == null) delete next[criterionId];
          else next[criterionId] = before;
          return { ...s, [entryId]: next };
        });
        setSaving((s) => ({ ...s, [key(entryId, criterionId)]: "error" }));
        setError(r.error);
      }
    });
  };

  const total = (entryId: string) => criteria.reduce((a, c) => a + (scores[entryId]?.[c.id] ?? 0), 0);
  const complete = (entryId: string) => criteria.every((c) => scores[entryId]?.[c.id] != null);
  const allComplete = entries.every((e) => complete(e.id));
  const missing = entries.filter((e) => !complete(e.id)).length;

  const submit = () => {
    startTransition(async () => {
      const r = await submitSheet(categoryId);
      if (r.ok) setSubmitted(true);
      else setError(r.error);
    });
  };

  return (
    <div className="space-y-4">
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
              const v = scores[e.id]?.[c.id];
              const st = saving[key(e.id, c.id)];
              return (
                <div key={c.id}>
                  <div className="mb-1 flex items-center justify-between text-sm font-medium">
                    <span>{c.name}</span>
                    <span className="text-xs text-neutral-400">{st === "saving" ? "saving" : st === "error" ? "not saved" : ""}</span>
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
            {submitted ? (
              <span className="font-semibold text-green-700">Submitted. You can still change a score until the category is closed.</span>
            ) : allComplete ? (
              <span>All participants scored. Submit when you are done.</span>
            ) : (
              <span className="text-neutral-600">{missing} participant{missing === 1 ? "" : "s"} still without all scores.</span>
            )}
          </div>
          <Button onClick={submit} disabled={pending || !allComplete || submitted}>
            {submitted ? "Submitted" : "Submit my scores"}
          </Button>
        </Card>
      )}
    </div>
  );
}
