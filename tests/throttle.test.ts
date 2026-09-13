import { test } from "node:test";
import assert from "node:assert/strict";
import { afterFailure, lockAfter, secondsLocked, type Attempt } from "../src/lib/throttle.ts";

const t0 = new Date("2026-10-15T10:00:00Z");
const at = (s: number) => new Date(t0.getTime() + s * 1000);

function fail(times: number, a: Attempt | null = null): Attempt | null {
  for (let i = 0; i < times; i++) a = afterFailure(a, t0);
  return a;
}

test("Four wrong tries cost nothing", () => {
  assert.equal(secondsLocked(fail(4), t0), 0);
});

test("The fifth wrong try locks for 30 seconds, and the lock expires", () => {
  const a = fail(5);
  assert.equal(secondsLocked(a, t0), 30);
  assert.equal(secondsLocked(a, at(29)), 1);
  assert.equal(secondsLocked(a, at(30)), 0);
});

test("Every five more failures double the wait, capped at ten minutes", () => {
  assert.equal(lockAfter(5), 30);
  assert.equal(lockAfter(10), 60);
  assert.equal(lockAfter(15), 120);
  assert.equal(lockAfter(20), 240);
  assert.equal(lockAfter(25), 480);
  assert.equal(lockAfter(30), 600);
  assert.equal(lockAfter(100), 600);
});

test("Failures between multiples of five keep the current lock instead of extending it", () => {
  const a = fail(5)!;
  const b = afterFailure(a, at(10));
  assert.equal(b.failures, 6);
  assert.equal(b.lockedUntil?.getTime(), a.lockedUntil?.getTime());
});

test("Nothing recorded means nothing locked", () => {
  assert.equal(secondsLocked(null, t0), 0);
});
