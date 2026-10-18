"use client";

import { useEffect } from "react";

// Keeps an open page on the current build. Every minute it asks which build
// is live; when that differs from the build this page came
// from, the page reloads itself. It never reloads while there is somewhere
// to type that has been touched: a field with focus, or one whose value
// differs from what the page loaded with. Score buttons save on every tap,
// so a reload there loses nothing.
//
// It DOES reload with scores still waiting to be sent. On 16 October 2026 it
// did not, and that locked a judge's tablet: a page from the old build can
// no longer send to the new one, so its scores could never leave, so it
// never reloaded, and it showed "No connection" with the wifi working. The
// waiting scores are safe in the tablet's storage and the score sheet sends
// them as it opens; and the build question just got an answer, so the
// network is there for the reload.
//
// A failed save asks at once ("rn-save-failed", from the score sheet)
// instead of waiting for the next minute.
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
    // One reload per new build: if the page comes back still old (a cached
    // copy), it waits for the next build instead of reloading in a loop.
    const alreadyTried = (live: string) => {
      try {
        if (sessionStorage.getItem("rn-reloaded-for") === live) return true;
        sessionStorage.setItem("rn-reloaded-for", live);
      } catch {}
      return false;
    };
    const check = async () => {
      try {
        // A static file written at build time (scripts/write-version.mjs):
        // asking it costs no function call.
        const r = await fetch("/version.json", { cache: "no-store" });
        if (!r.ok) return;
        const { version: live } = await r.json();
        if (!stopped && live && live !== version && !typing() && !alreadyTried(live)) window.location.reload();
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
    window.addEventListener("rn-save-failed", check);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("rn-save-failed", check);
    };
  }, [version]);
  return null;
}
