// The judges of 2026 and the ways they were seen typing their names.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchJudge } from "../src/lib/judge-name.ts";

const judges = [
  "Alessandra DAmbra", "Aziza", "Viktoriia Bogonis", "Nasra Emam", "Nur Zahira",
  "Cris Aysel", "Yana Holka", "Sonya of Cairo", "Oksana Polianichko",
].map((name) => ({ name }));
const who = (typed: string) => matchJudge(judges, typed)?.name ?? null;

test("Alessandra gets in however the apostrophe is typed (the four failures of 11 October)", () => {
  for (const typed of ["Alessandra D'Ambra", "Alessandra D’Ambra", "alessandra dambra", "Alessandra  DAmbra", "Alessandra", "ALESSANDRA d'ambra "]) {
    assert.equal(who(typed), "Alessandra DAmbra", typed);
  }
});

test("Accents, case and spaces do not matter", () => {
  assert.equal(who("Crís Aysel"), "Cris Aysel");
  assert.equal(who("  yana   holka "), "Yana Holka");
  assert.equal(who("sonya of cairo"), "Sonya of Cairo");
});

test("A first name alone works only when no other judge shares it", () => {
  assert.equal(who("Nasra"), "Nasra Emam");
  const two = [...judges, { name: "Yana Petrova" }];
  assert.equal(matchJudge(two, "Yana"), null);
  assert.equal(matchJudge(two, "Yana Holka")?.name, "Yana Holka");
});

test("A different name is still refused", () => {
  assert.equal(who("Alessandro"), null);
  assert.equal(who("Holka"), null);
  assert.equal(who(""), null);
});
