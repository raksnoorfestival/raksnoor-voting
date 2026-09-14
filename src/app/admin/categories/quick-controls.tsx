"use client";

import { useTransition } from "react";
import { setCategoryStatus, setResultsVisible } from "@/actions/admin";

type Status = "DRAFT" | "OPEN" | "CLOSED";

// One tap opens or closes a category, one tap shows or hides its results.
// Same colours as the badges elsewhere. Results can only go public once
// the category is closed (the server refuses otherwise).
export function QuickControls({ id, status, resultsVisible }: { id: string; status: Status; resultsVisible: boolean }) {
  const [pending, start] = useTransition();
  const next: Status = status === "OPEN" ? "CLOSED" : "OPEN";
  const statusClass =
    status === "OPEN"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : status === "CLOSED"
        ? "bg-neutral-800 text-white hover:bg-neutral-700"
        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200";
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
        disabled={pending || (!resultsVisible && status !== "CLOSED")}
        title={resultsVisible ? "Tap to hide from the public page" : status === "CLOSED" ? "Tap to show on the public page" : "Close the category first"}
        onClick={() => start(() => setResultsVisible(id, !resultsVisible))}
        className={`h-7 min-w-16 rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${resultsVisible ? "bg-amber-100 text-amber-900 hover:bg-amber-200" : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"}`}
      >
        {resultsVisible ? "Public" : "Hidden"}
      </button>
    </span>
  );
}
