"use client";

import { useState } from "react";
import { setJudgeCategories } from "@/actions/admin";
import { StateForm, SubmitButton } from "@/components/forms";

type Level = { id: string; name: string; categories: { id: string; name: string }[] };

// "All categories", or tick the ones this judge votes in. The parent keys
// this component on the saved state, so after a save it remounts with what
// the server has (React resets the form fields after an action).
export function JudgeCategories({ judgeId, allCategories, assigned, levels }: { judgeId: string; allCategories: boolean; assigned: string[]; levels: Level[] }) {
  const [all, setAll] = useState(allCategories);
  return (
    <StateForm action={setJudgeCategories} className="mt-3 border-t border-neutral-100 pt-3">
      <input type="hidden" name="judgeId" value={judgeId} />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="allCategories" defaultChecked={allCategories} onChange={(e) => setAll(e.target.checked)} /> All categories
        </label>
        <SubmitButton variant="secondary">Save categories</SubmitButton>
      </div>
      {!all && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {levels.map((l) => (
            <div key={l.id}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{l.name}</div>
              {l.categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <input type="checkbox" name="categoryId" value={c.id} defaultChecked={assigned.includes(c.id)} /> {c.name}
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </StateForm>
  );
}
