"use client";

import { useState, useTransition } from "react";
import { decideChampionshipTie } from "@/actions/admin";
import { Button } from "@/components/ui";

export function ChampionshipTieDecider({ levelId, place, rows }: { levelId: string; place: number; rows: { id: string; name: string }[] }) {
  const [order, setOrder] = useState(rows);
  const [pending, start] = useTransition();
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="mb-2 text-sm font-semibold text-amber-900">Tie for place {place}: put them in finishing order</div>
      <ol className="mb-3 space-y-1">
        {order.map((e, i) => (
          <li key={e.id} className="flex items-center gap-2 text-sm">
            <span className="w-6 text-right font-bold text-neutral-500">{place + i}.</span>
            <span className="flex-1 font-medium">{e.name}</span>
            <button type="button" className="rounded border border-amber-300 bg-white px-2 py-0.5 text-xs disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>Up</button>
            <button type="button" className="rounded border border-amber-300 bg-white px-2 py-0.5 text-xs disabled:opacity-30" disabled={i === order.length - 1} onClick={() => move(i, 1)}>Down</button>
          </li>
        ))}
      </ol>
      <Button disabled={pending} onClick={() => start(() => decideChampionshipTie(levelId, order.map((e) => e.id)))}>
        {pending ? "Saving" : "Save jury decision"}
      </Button>
    </div>
  );
}
