"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const int = (form: FormData, key: string, fallback = 0) => {
  const n = Number(form.get(key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

function friendly(e: unknown, what: string): FormState {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: `That ${what} already exists in the library.` };
  throw e;
}

const refresh = () => {
  revalidatePath("/admin/library");
  revalidatePath("/admin/events");
};

// ---------- Levels ----------

export async function createLibraryLevel(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return { error: "Give the level a name." };
  const last = await db.libraryLevel.findFirst({ orderBy: { sortOrder: "desc" } });
  try {
    await db.libraryLevel.create({ data: { name, sortOrder: (last?.sortOrder ?? 0) + 1, hasChampionship: form.get("hasChampionship") === "on" } });
  } catch (e) {
    return friendly(e, "level");
  }
  refresh();
  return { ok: `Level "${name}" added to the library.` };
}

export async function updateLibraryLevel(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the level a name." };
  try {
    await db.libraryLevel.update({ where: { id }, data: { name, sortOrder: int(form, "sortOrder"), hasChampionship: form.get("hasChampionship") === "on" } });
  } catch (e) {
    return friendly(e, "level");
  }
  refresh();
  return { ok: "Saved." };
}

export async function deleteLibraryLevel(id: string) {
  await requireAdmin();
  // Cascade removes its categories; events already created keep their copies.
  await db.libraryLevel.delete({ where: { id } });
  refresh();
}

// ---------- Categories ----------

export async function createLibraryCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const levelId = str(form, "levelId");
  const name = str(form, "name");
  if (!levelId || !name) return { error: "Choose a level and give the category a name." };
  const last = await db.libraryCategory.findFirst({ where: { levelId }, orderBy: { sortOrder: "desc" } });
  try {
    await db.libraryCategory.create({ data: { levelId, name, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  } catch (e) {
    return friendly(e, "category");
  }
  refresh();
  return { ok: `Category "${name}" added.` };
}

export async function updateLibraryCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the category a name." };
  try {
    await db.libraryCategory.update({ where: { id }, data: { name, sortOrder: int(form, "sortOrder") } });
  } catch (e) {
    return friendly(e, "category");
  }
  refresh();
  return { ok: "Saved." };
}

export async function deleteLibraryCategory(id: string) {
  await requireAdmin();
  await db.libraryCategory.delete({ where: { id } });
  refresh();
}

// ---------- Between library and events ----------

// Copies the library into an event: levels and categories that the event
// does not have yet (matched by name). Nothing in the event is changed or
// removed, so it is safe on an event that already has scores.
export async function copyLibraryToEvent(eventId: string): Promise<{ levels: number; categories: number }> {
  await requireAdmin();
  const library = await db.libraryLevel.findMany({ include: { categories: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
  const existing = await db.level.findMany({ where: { eventId }, include: { categories: true } });
  let levels = 0;
  let categories = 0;
  for (const [i, l] of library.entries()) {
    let level = existing.find((x) => x.name.toLowerCase() === l.name.toLowerCase());
    if (!level) {
      const last = Math.max(0, ...existing.map((x) => x.sortOrder));
      level = { ...(await db.level.create({ data: { eventId, name: l.name, sortOrder: last + i + 1, hasChampionship: l.hasChampionship } })), categories: [] };
      existing.push(level);
      levels++;
    }
    for (const c of l.categories) {
      if (level.categories.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) continue;
      const last = Math.max(0, ...level.categories.map((x) => x.sortOrder));
      const created = await db.category.create({ data: { eventId, levelId: level.id, name: c.name, sortOrder: last + 1 } });
      level.categories.push(created);
      categories++;
    }
  }
  revalidatePath("/admin/categories");
  revalidatePath("/admin/levels");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  return { levels, categories };
}

export async function copyLibraryToEventForm(_: FormState, form: FormData): Promise<FormState> {
  const eventId = str(form, "eventId");
  const r = await copyLibraryToEvent(eventId);
  return { ok: r.levels + r.categories === 0 ? "The event already has everything in the library." : `Added ${r.levels} level${r.levels === 1 ? "" : "s"} and ${r.categories} categor${r.categories === 1 ? "y" : "ies"}.` };
}

// The other way: fills the library from an event that already has the
// levels and categories (the first time, from 2025). Adds what is missing.
export async function fillLibraryFromEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const levels = await db.level.findMany({ where: { eventId }, include: { categories: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
  if (levels.length === 0) return { error: "That event has no levels." };
  const library = await db.libraryLevel.findMany({ include: { categories: true } });
  let added = 0;
  for (const l of levels) {
    let lib = library.find((x) => x.name.toLowerCase() === l.name.toLowerCase());
    if (!lib) {
      lib = { ...(await db.libraryLevel.create({ data: { name: l.name, sortOrder: l.sortOrder, hasChampionship: l.hasChampionship } })), categories: [] };
      library.push(lib);
    }
    for (const c of l.categories) {
      if (lib.categories.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) continue;
      lib.categories.push(await db.libraryCategory.create({ data: { levelId: lib.id, name: c.name, sortOrder: c.sortOrder } }));
      added++;
    }
  }
  refresh();
  return { ok: added === 0 ? "The library already had everything from that event." : `${added} categor${added === 1 ? "y" : "ies"} added to the library.` };
}

// Judges from another edition: same name, same password (changeable in
// Judges), same order. A judge the event already has (by name) is skipped.
export async function copyJudgesFromEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const toId = str(form, "eventId");
  const fromId = str(form, "fromEventId");
  if (!toId || !fromId || toId === fromId) return { error: "Choose another event to copy the judges from." };
  const [source, existing] = await Promise.all([
    db.judge.findMany({ where: { eventId: fromId }, orderBy: { sortOrder: "asc" } }),
    db.judge.findMany({ where: { eventId: toId } }),
  ]);
  if (source.length === 0) return { error: "That event has no judges." };
  const have = new Set(existing.map((j) => j.name.toLowerCase()));
  let order = Math.max(0, ...existing.map((j) => j.sortOrder));
  let added = 0;
  for (const j of source) {
    if (have.has(j.name.toLowerCase())) continue;
    await db.judge.create({ data: { eventId: toId, name: j.name, passwordHash: j.passwordHash, sortOrder: ++order, active: j.active } });
    added++;
  }
  revalidatePath("/admin/judges");
  revalidatePath("/admin/events");
  revalidatePath("/admin");
  return { ok: added === 0 ? "Every judge from that event is already here." : `${added} judge${added === 1 ? "" : "s"} copied, with the same passwords as before.` };
}
