// The judge's pages kept on the tablet, so a drop in the hall's wifi never
// stops the scoring. Only the judge's side (/judge...) is covered; the admin
// and the results always need the connection.
//
// - A judge page is asked from the network first. If the network answers,
//   that answer is shown and a copy is kept. If it does not answer within a
//   few seconds, the last copy is shown, marked as a copy (the page then
//   says "offline copy from 14:32").
// - The app's code files (/_next/static) never change once published, so
//   they are kept the first time they are seen and served from the tablet.
// - Scores never go through here: they are sent by the score sheet, which
//   keeps them on the tablet until the server has them (score-sheet.tsx).
//
// Signing in again empties the copies (the sign-in page asks for it), so a
// shared tablet never shows one judge's pages to the next.

const PAGES = "rn-judge-pages-v1";
const STATIC = "rn-static-v1";
const WAIT_MS = 6000;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [PAGES, STATIC];
      for (const name of await caches.keys()) if (!keep.includes(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

const isJudgePage = (url) => url.origin === self.location.origin && (url.pathname === "/judge" || url.pathname.startsWith("/judge/")) && url.pathname !== "/judge/login";
const isStatic = (url) => url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"));
const pageKey = (url) => new URL(url.pathname, self.location.origin).toString();

// Every code file a page names, so a page kept before it was ever opened
// still has what it needs to run without the network.
async function keepCodeOf(html) {
  const files = new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) ?? []);
  const cache = await caches.open(STATIC);
  await Promise.all(
    [...files].map(async (path) => {
      if (await cache.match(path)) return;
      try {
        const r = await fetch(path);
        if (r.ok) await cache.put(path, r);
      } catch {}
    }),
  );
}

// A page answer worth keeping: a real page, not a redirect to sign in nor
// a "not found".
async function keepPage(url, response) {
  if (!response.ok || response.type !== "basic" || response.redirected) return;
  const html = await response.clone().text();
  const headers = new Headers(response.headers);
  headers.set("x-rn-kept-at", String(Date.now()));
  const cache = await caches.open(PAGES);
  await cache.put(pageKey(url), new Response(html, { status: 200, headers }));
  await keepCodeOf(html);
}

// The copy, with a mark the page reads to say it is a copy and from when.
async function copyOf(url) {
  const cache = await caches.open(PAGES);
  const kept = await cache.match(pageKey(url));
  if (!kept) return null;
  const at = kept.headers.get("x-rn-kept-at") ?? "0";
  const html = (await kept.text()).replace("<head>", `<head><meta name="rn-offline-copy" content="${at}">`);
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
}

const NOT_KEPT = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No connection</title>
<style>body{font-family:system-ui,sans-serif;background:#faf7f8;color:#141414;margin:0;padding:24px}main{max-width:32rem;margin:10vh auto;background:#fff;border:1px solid #e5e5e5;border-radius:16px;padding:24px}a{color:#8b1e3f;font-weight:600}</style></head>
<body><main><h1 style="margin-top:0">No connection</h1><p>This page was not saved on this tablet yet, so it cannot open without the connection.</p><p>Scores already given are safe on this tablet.</p><p><a href="/judge">Back to your categories</a></p></main></body></html>`;

async function judgeNavigation(event, url) {
  const network = fetch(event.request).then(async (r) => {
    event.waitUntil(keepPage(url, r.clone()).catch(() => {}));
    return r;
  });
  network.catch(() => {});
  const late = new Promise((resolve) => setTimeout(() => resolve(null), WAIT_MS));
  try {
    const first = await Promise.race([network, late]);
    if (first) return first;
  } catch {}
  const copy = await copyOf(url);
  if (copy) return copy;
  try {
    return await network;
  } catch {
    return new Response(NOT_KEPT, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
  }
}

async function staticFile(request) {
  const cache = await caches.open(STATIC);
  const kept = await cache.match(request.url);
  if (kept) return kept;
  const r = await fetch(request);
  if (r.ok) await cache.put(request.url, r.clone());
  return r;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate" && isJudgePage(url)) event.respondWith(judgeNavigation(event, url));
  else if (isStatic(url)) event.respondWith(staticFile(request));
});

// From the judge's list: keep a copy of each open category before the wifi
// has a chance to drop. A page kept in the last half hour is not asked
// again (each ask is one of the free plan's function calls).
const FRESH_MS = 30 * 60 * 1000;
self.addEventListener("message", (event) => {
  const data = event.data ?? {};
  if (data.type === "keep" && Array.isArray(data.paths)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PAGES);
        for (const path of data.paths) {
          const url = new URL(path, self.location.origin);
          if (!isJudgePage(url)) continue;
          const kept = await cache.match(pageKey(url));
          if (kept && Date.now() - Number(kept.headers.get("x-rn-kept-at") ?? 0) < FRESH_MS) continue;
          try {
            const r = await fetch(url, { credentials: "same-origin", redirect: "manual" });
            await keepPage(url, r);
          } catch {}
        }
      })(),
    );
  }
  if (data.type === "forget") event.waitUntil(caches.delete(PAGES));
});
