"use client";

import { useEffect } from "react";

// Keeps an open page on the current build. Every minute it asks the server
// which build is live; when that differs from the build this page came
// from, the page reloads itself. It never reloads while there is somewhere
// to type that has been touched: a field with focus, or one whose value
// differs from what the page loaded with. Score buttons save on every tap,
// so a reload there loses nothing.
export function UpdateWatch({ version }: { version: string }) {
  useEffect(() => {
    if (version === "dev") return;
    let stopped = false;
    const typing = () => {
      const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
      for (const f of fields) {
        if (f instanceof HTMLInputElement && (f.type === "hidden" || f.type === "checkbox" || f.type === "radio")) continue;
        if (document.activeElement === f) return true;
        if (f.value !== f.defaultValue) return true;
      }
      return false;
    };
    const check = async () => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { version: live } = await r.json();
        if (!stopped && live && live !== version && !typing()) window.location.reload();
      } catch {
        // Offline or a hiccup: try again next minute.
      }
    };
    const id = setInterval(check, 60_000);
    // Also when the app comes back to the front, which on a phone is when
    // an old build is most likely still showing.
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [version]);
  return null;
}
