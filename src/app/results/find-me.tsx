"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Card, Place } from "@/components/ui";

export type PersonResult = { categoryId: string; level: string; category: string; place: number; tie: boolean; final: boolean };
export type Person = { id: string; name: string; results: PersonResult[] };

// Accents and case do not matter when typing a name.
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

// Type a name, pick it, see only that person's places. The chips narrow it
// to one category, so a screenshot shows just the one that matters.
export function FindMe({ people, eventName }: { people: Person[]; eventName: string }) {
  const [text, setText] = useState("");
  const [chosen, setChosen] = useState<Person | null>(null);
  const [only, setOnly] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = fold(text.trim());
    if (!q) return [];
    return people.filter((p) => fold(p.name).includes(q)).slice(0, 8);
  }, [text, people]);

  const pick = (p: Person) => {
    setChosen(p);
    setOnly(null);
    setText(p.name);
  };

  const shown = chosen ? chosen.results.filter((r) => !only || r.categoryId === only) : [];

  return (
    <Card className="mb-6">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600" htmlFor="find-me">
        Find your name
      </label>
      <div className="relative">
        <input
          id="find-me"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setChosen(null);
            setOnly(null);
          }}
          placeholder="Start typing your name"
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base outline-none focus:border-wine focus:ring-2 focus:ring-wine/20"
        />
        {!chosen && matches.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
            {matches.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => pick(p)} className="block w-full px-3 py-2 text-left hover:bg-wine-light">
                  {p.name}
                  <span className="ml-2 text-xs text-neutral-500">
                    {p.results.length} categor{p.results.length === 1 ? "y" : "ies"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {!chosen && text.trim() && matches.length === 0 && <p className="mt-2 text-sm text-neutral-500">No published result with that name yet.</p>}
      </div>

      {chosen && (
        <div className="mt-4">
          {chosen.results.length > 1 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setOnly(null)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${only === null ? "bg-wine text-white" : "border border-neutral-300 bg-white text-neutral-700"}`}
              >
                All
              </button>
              {chosen.results.map((r) => (
                <button
                  key={r.categoryId}
                  type="button"
                  onClick={() => setOnly(r.categoryId)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${only === r.categoryId ? "bg-wine text-white" : "border border-neutral-300 bg-white text-neutral-700"}`}
                >
                  {r.level} / {r.category}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {shown.map((r) => (
              <div key={r.categoryId} className="rounded-xl border border-neutral-200 bg-paper p-4">
                <div className="text-xs uppercase tracking-wide text-neutral-500">{eventName}</div>
                <div className="mt-1 text-sm text-neutral-600">{r.level}</div>
                <div className="text-lg font-bold">{r.category}</div>
                <div className="mt-3 flex items-center gap-3">
                  <Place n={r.place} />
                  <div>
                    <div className="text-xl font-bold">{ordinal(r.place)} place</div>
                    <div className="text-sm text-neutral-600">{chosen.name}</div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {r.tie && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Tie, jury to decide</span>}
                  {!r.final && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800">Live, may still change</span>}
                  <Link href={`/results/${r.categoryId}`} className="text-wine underline">
                    Full results and scores
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
