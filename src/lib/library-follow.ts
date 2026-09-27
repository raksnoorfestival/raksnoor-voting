import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// The festival being prepared follows the library.
//
// Every change to the library also goes to the current event, as long as
// nobody has voted in it yet. From the first score on, the event is on its
// own, and past editions (all voted, none current) are never touched.
// Matching is by name, level by level, the way an event is copied.
//
// The library actions call these after writing the library, every one of
// them, so there is no way to change the library and forget the festival.
// Each returns the sentence to show the admin.

export async function preparingEvent() {
  const event = await db.event.findFirst({ where: { isCurrent: true } });
  if (!event) return null;
  const voted = await db.score.count({ where: { entry: { category: { eventId: event.id } } } });
  return voted === 0 ? event : null;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const taken = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

async function eventLevel(eventId: string, name: string) {
  const levels = await db.level.findMany({ where: { eventId }, include: { categories: true } });
  return levels.find((l) => same(l.name, name)) ?? null;
}

async function ensureLevel(eventId: string, name: string, hasChampionship: boolean) {
  const found = await eventLevel(eventId, name);
  if (found) return found;
  const last = await db.level.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" } });
  return { ...(await db.level.create({ data: { eventId, name, sortOrder: (last?.sortOrder ?? 0) + 1, hasChampionship } })), categories: [] };
}

export async function followLevelCreated(name: string, hasChampionship: boolean): Promise<string | null> {
  const event = await preparingEvent();
  if (!event) return null;
  await ensureLevel(event.id, name, hasChampionship);
  return `Also in ${event.name}.`;
}

export async function followLevelUpdated(oldName: string, data: { name: string; sortOrder: number; hasChampionship: boolean }): Promise<string | null> {
  const event = await preparingEvent();
  if (!event) return null;
  const target = await eventLevel(event.id, oldName);
  if (!target) return null;
  try {
    await db.level.update({ where: { id: target.id }, data });
  } catch (e) {
    if (taken(e)) return `${event.name} already has a level "${data.name}", so its "${target.name}" was left as it is.`;
    throw e;
  }
  return `Also in ${event.name}.`;
}

export async function followLevelDeleted(name: string): Promise<string | null> {
  const event = await preparingEvent();
  if (!event) return null;
  const target = await eventLevel(event.id, name);
  if (!target) return null;
  const entries = await db.entry.count({ where: { category: { levelId: target.id } } });
  if (entries > 0) return `In ${event.name} the level "${target.name}" stays, because it already has ${entries} participant entr${entries === 1 ? "y" : "ies"}. Delete it there if you mean to.`;
  await db.level.delete({ where: { id: target.id } });
  return `Also removed from ${event.name}.`;
}

export async function followCategoryCreated(level: { name: string; hasChampionship: boolean }, name: string): Promise<string | null> {
  const event = await preparingEvent();
  if (!event) return null;
  const l = await ensureLevel(event.id, level.name, level.hasChampionship);
  if (!l.categories.some((c) => same(c.name, name))) {
    const last = Math.max(0, ...l.categories.map((c) => c.sortOrder));
    await db.category.create({ data: { eventId: event.id, levelId: l.id, name, sortOrder: last + 1 } });
  }
  return `Also in ${event.name}.`;
}

export async function followCategoryUpdated(levelName: string, oldName: string, data: { name: string; sortOrder: number }): Promise<string | null> {
  const event = await preparingEvent();
  if (!event) return null;
  const l = await eventLevel(event.id, levelName);
  const target = l?.categories.find((c) => same(c.name, oldName));
  if (!l || !target) return null;
  try {
    await db.category.update({ where: { id: target.id }, data });
  } catch (e) {
    if (taken(e)) return `${event.name} already has "${data.name}" in ${l.name}, so its "${target.name}" was left as it is.`;
    throw e;
  }
  return `Also in ${event.name}.`;
}

export async function followCategoryDeleted(levelName: string, name: string): Promise<string | null> {
  const event = await preparingEvent();
  if (!event) return null;
  const l = await eventLevel(event.id, levelName);
  const target = l?.categories.find((c) => same(c.name, name));
  if (!l || !target) return null;
  const entries = await db.entry.count({ where: { categoryId: target.id } });
  if (entries > 0) return `In ${event.name} "${l.name} / ${target.name}" stays, because it already has ${entries} participant${entries === 1 ? "" : "s"}. Delete it there if you mean to.`;
  await db.category.delete({ where: { id: target.id } });
  return `Also removed from ${event.name}.`;
}
