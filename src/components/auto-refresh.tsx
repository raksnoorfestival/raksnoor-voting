"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Re-fetches the page's server data every `seconds`, without a full reload
// and never while someone is writing in a field: a refresh on top of a
// half-typed name is how work gets lost.
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
      if (!typing && document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
