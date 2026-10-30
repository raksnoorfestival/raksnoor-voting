import { test } from "node:test";
import assert from "node:assert/strict";
import { criteriaFor, SCOPED_DEFAULTS } from "../src/lib/criteria";

const five = ["Technique", "Choreo & Musicality", "Stage Presence", "Originality", "Image"].map((name) => ({ name, everywhere: true, categories: [] as { id: string }[] }));
const sync = { name: "Synchronization", everywhere: false, categories: [{ id: "groups-oriental" }] };
const impro = { name: "Improvisation", everywhere: false, categories: [{ id: "pro-live-band" }, { id: "pro-impro-drummer" }] };
const all = [...five, sync, impro];
const names = (id: string) => criteriaFor(id, all).map((c) => c.name);

test("a solo category gets the five", () => {
  assert.deepEqual(names("pro-oriental"), five.map((c) => c.name));
});

test("groups add Synchronization, live music adds Improvisation, never both", () => {
  assert.deepEqual(names("groups-oriental"), [...five.map((c) => c.name), "Synchronization"]);
  assert.deepEqual(names("pro-live-band"), [...five.map((c) => c.name), "Improvisation"]);
  assert.deepEqual(names("pro-impro-drummer"), [...five.map((c) => c.name), "Improvisation"]);
});

test("a scoped criterion with no category counts nowhere, not everywhere", () => {
  assert.deepEqual(criteriaFor("x", [{ name: "S", everywhere: false, categories: [] }]), []);
});

test("a new event places the two by name", () => {
  const cats = [
    { name: "Oriental Adult", level: { name: "Groups" } },
    { name: "Live Band", level: { name: "Professional" } },
    { name: "Improvisation with Drummer", level: { name: "Master" } },
    { name: "Oriental", level: { name: "Advanced" } },
  ];
  const [s, i] = SCOPED_DEFAULTS;
  assert.deepEqual(cats.filter(s.matches).map((c) => c.name), ["Oriental Adult"]);
  assert.deepEqual(cats.filter(i.matches).map((c) => c.name), ["Live Band", "Improvisation with Drummer"]);
});
