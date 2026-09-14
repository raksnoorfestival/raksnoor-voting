"use client";

import { useTransition } from "react";
import { setCategoryStatus, setResultsVisible } from "@/actions/admin";

type Status = "DRAFT" | "OPEN" | "CLOSED";

// One tap opens or closes a category, one tap shows or hides its results.
// Green is open, red is closed, grey has never been opened.
export function QuickControls({ id, status, resultsVisible }: { id: string; status: Status; resultsVisible: boolean }) {
  const [pending, start] = useTransition();
  const next: Status = status === "OPEN" ? "CLOSED" : "OPEN";
  const statusClass =
    status === "OPEN"
      ? "bg-green-600 text-white hover:bg-green-700"
      : status === "CLOSED"
        ? "bg-red-600 text-white hover:bg-red-700"
        : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300";
  const label = status === "OPEN" ? "Open" : status === "CLOSED" ? "Closed" : "Draft";
  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        title={status === "OPEN" ? "Tap to close to the judges" : "Tap to open to the judges"}
        onClick={() => start(() => setCategoryStatus(id, next))}
        className={`h-7 min-w-16 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${statusClass}`}
      >
        {pending ? "..." : label}
      </button>
      <button
        type="button"
        disabled={pending}
        title={resultsVisible ? "Tap to hide from the public page" : "Tap to show on the public page"}
        onClick={() => start(() => setResultsVisible(id, !resultsVisible))}
        className={`h-7 min-w-16 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${resultsVisible ? "bg-amber-400 text-amber-950 hover:bg-amber-500" : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"}`}
      >
        {resultsVisible ? "Public" : "Hidden"}
      </button>
    </span>
  );
}
