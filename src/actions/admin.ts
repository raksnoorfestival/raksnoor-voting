"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword, checkPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";
import { parseParticipantsSheet } from "@/lib/excel";
import { copyLibraryToEvent } from "@/actions/library";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const int = (form: FormData, key: string, fallback = 0) => {
  const n = Number(form.get(key));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

// Prisma's unique-violation code, so a duplicate name reads as a sentence
// and not as a stack trace.
function friendly(e: unknown, what: string): FormState {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: `That ${what} already exists.` };
  throw e;
}

function refresh(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
  revalidatePath("/admin");
}

// ---------- Events ----------

export async function createEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(form, "name");
  if (!name) return { error: "Give the event a name." };
  const startsAt = str(form, "startsAt") ? new Date(str(form, "startsAt")) : null;
  const endsAt = str(form, "endsAt") ? new Date(str(form, "endsAt")) : null;
  const count = await db.event.count();
  const event = await db.event.create({ data: { name, startsAt, endsAt, isCurrent: count === 0 } });
  // A new event starts with the five criteria the festival has always used.
  await db.criterion.createMany({
    data: ["Technique", "Choreo & Musicality", "Stage Presence", "Originality", "Image"].map((n, i) => ({
      eventId: event.id,
      name: n,
      maxPoints: 10,
      priority: i + 1,
    })),
  });
  // The levels and categories come from the library, as a copy.
  let copied = "";
  if (form.get("fromLibrary") === "on") {
    const r = await copyLibraryToEvent(event.id);
    copied = r.categories > 0 ? ` ${r.levels} levels and ${r.categories} categories copied from the library.` : " The library is empty: add levels and categories by hand or fill the library first.";
  }
  refresh("/admin/events");
  return { ok: `Event "${name}" created.${copied}` };
}

export async function setCurrentEvent(id: string) {
  await requireAdmin();
  await db.$transaction([
    db.event.updateMany({ data: { isCurrent: false } }),
    db.event.update({ where: { id }, data: { isCurrent: true } }),
  ]);
  refresh("/admin/events");
}

export async function updateEvent(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the event a name." };
  await db.event.update({
    where: { id },
    data: {
      name,
      startsAt: str(form, "startsAt") ? new Date(str(form, "startsAt")) : null,
      endsAt: str(form, "endsAt") ? new Date(str(form, "endsAt")) : null,
    },
  });
  refresh("/admin/events");
  return { ok: "Saved." };
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  const e = await db.event.findUnique({ where: { id }, include: { _count: { select: { categories: true, participants: true } } } });
  if (!e) return;
  if (e.isCurrent) throw new Error("Make another event current first.");
  await db.event.delete({ where: { id } });
  refresh("/admin/events");
}

export async function setPublicPassword(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "eventId");
  const password = str(form, "password");
  await db.event.update({ where: { id }, data: { publicPassword: password || null } });
  refresh("/admin/settings");
  return { ok: password ? "Results password set." : "Results page closed (no password)." };
}

// ---------- Levels ----------

export async function createLevel(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const name = str(form, "name");
  if (!name) return { error: "Give the level a name." };
  const last = await db.level.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" } });
  try {
    await db.level.create({ data: { eventId, name, sortOrder: (last?.sortOrder ?? 0) + 1, hasChampionship: form.get("hasChampionship") === "on" } });
  } catch (e) {
    return friendly(e, "level");
  }
  refresh("/admin/levels", "/admin/categories");
  return { ok: `Level "${name}" created.` };
}

export async function updateLevel(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the level a name." };
  try {
    await db.level.update({ where: { id }, data: { name, sortOrder: int(form, "sortOrder"), hasChampionship: form.get("hasChampionship") === "on" } });
  } catch (e) {
    return friendly(e, "level");
  }
  refresh("/admin/levels", "/admin/categories");
  return { ok: "Saved." };
}

export async function deleteLevel(id: string) {
  await requireAdmin();
  const n = await db.category.count({ where: { levelId: id } });
  if (n > 0) throw new Error("Delete or move its categories first.");
  await db.level.delete({ where: { id } });
  refresh("/admin/levels");
}

// ---------- Categories ----------

export async function createCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const levelId = str(form, "levelId");
  const name = str(form, "name");
  if (!name || !levelId) return { error: "Choose a level and give the category a name." };
  const last = await db.category.findFirst({ where: { levelId }, orderBy: { sortOrder: "desc" } });
  try {
    await db.category.create({ data: { eventId, levelId, name, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  } catch (e) {
    return friendly(e, "category");
  }
  refresh("/admin/categories");
  return { ok: `Category "${name}" created.` };
}

export async function updateCategory(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  const levelId = str(form, "levelId");
  if (!name || !levelId) return { error: "Choose a level and give the category a name." };
  try {
    await db.category.update({ where: { id }, data: { name, levelId, sortOrder: int(form, "sortOrder") } });
  } catch (e) {
    return friendly(e, "category");
  }
  refresh("/admin/categories", `/admin/categories/${id}`);
  return { ok: "Saved." };
}

export async function setCategoryStatus(id: string, status: "DRAFT" | "OPEN" | "CLOSED") {
  await requireAdmin();
  // Results can only be public while nothing can change: reopening takes
  // the category off the public page.
  await db.category.update({ where: { id }, data: { status, ...(status !== "CLOSED" ? { resultsVisible: false } : {}) } });
  refresh("/admin/categories", `/admin/categories/${id}`, "/judge", `/judge/${id}`, "/results");
}

export async function setResultsVisible(id: string, visible: boolean) {
  await requireAdmin();
  if (visible) {
    const c = await db.category.findUnique({ where: { id } });
    if (c?.status !== "CLOSED") throw new Error("Close the category first. Results go public only when the judges can no longer change them.");
  }
  await db.category.update({ where: { id }, data: { resultsVisible: visible } });
  refresh("/admin/categories", `/admin/categories/${id}`, "/results", `/results/${id}`);
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const n = await db.score.count({ where: { entry: { categoryId: id } } });
  if (n > 0) throw new Error("This category already has scores. Close it instead of deleting it.");
  await db.category.delete({ where: { id } });
  refresh("/admin/categories");
  redirect("/admin/categories");
}

// ---------- Participants ----------

export async function createParticipant(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const name = str(form, "name");
  if (!name) return { error: "Give the participant a name." };
  try {
    await db.participant.create({ data: { eventId, name, notes: str(form, "notes") || null } });
  } catch (e) {
    return friendly(e, "participant");
  }
  refresh("/admin/participants");
  return { ok: `"${name}" added.` };
}

export async function updateParticipant(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the participant a name." };
  try {
    await db.participant.update({ where: { id }, data: { name, notes: str(form, "notes") || null } });
  } catch (e) {
    return friendly(e, "participant");
  }
  refresh("/admin/participants");
  return { ok: "Saved." };
}

export async function deleteParticipant(id: string) {
  await requireAdmin();
  const n = await db.score.count({ where: { entry: { participantId: id } } });
  if (n > 0) throw new Error("This participant already has scores and cannot be deleted.");
  await db.participant.delete({ where: { id } });
  refresh("/admin/participants", "/admin/categories");
}

// Excel import: one row per participant and category. Names are matched
// case-insensitively so "Ana Silva" and "ana silva" are the same dancer.
export async function importParticipants(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an Excel file." };
  let rows;
  try {
    rows = parseParticipantsSheet(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not read the file." };
  }
  if (rows.length === 0) return { error: "The file has no rows." };

  const levels = await db.level.findMany({ where: { eventId }, include: { categories: true } });
  const findCategory = (level: string, category: string) => {
    const l = levels.find((x) => x.name.toLowerCase() === level.toLowerCase());
    return l?.categories.find((c) => c.name.toLowerCase() === category.toLowerCase()) ?? null;
  };
  const unknown = rows.filter((r) => r.category && !findCategory(r.level, r.category)).map((r) => `${r.level} / ${r.category}`);
  if (unknown.length) return { error: `Unknown level/category: ${[...new Set(unknown)].join(", ")}. Create them first.` };

  let created = 0;
  let entries = 0;
  for (const r of rows) {
    let p = await db.participant.findFirst({ where: { eventId, name: { equals: r.name, mode: "insensitive" } } });
    if (!p) {
      p = await db.participant.create({ data: { eventId, name: r.name } });
      created++;
    }
    if (!r.category) continue;
    const cat = findCategory(r.level, r.category)!;
    const exists = await db.entry.findUnique({ where: { categoryId_participantId: { categoryId: cat.id, participantId: p.id } } });
    if (exists) continue;
    const number = r.number ?? ((await db.entry.findFirst({ where: { categoryId: cat.id }, orderBy: { number: "desc" } }))?.number ?? 0) + 1;
    await db.entry.create({ data: { categoryId: cat.id, participantId: p.id, number } });
    entries++;
  }
  refresh("/admin/participants", "/admin/categories");
  return { ok: `${created} new participant${created === 1 ? "" : "s"}, ${entries} new categor${entries === 1 ? "y entry" : "y entries"}.` };
}

// ---------- Entries (participant in a category) ----------

export async function addEntry(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const categoryId = str(form, "categoryId");
  const participantId = str(form, "participantId");
  if (!participantId) return { error: "Choose a participant." };
  const last = await db.entry.findFirst({ where: { categoryId }, orderBy: { number: "desc" } });
  const number = int(form, "number", 0) || (last?.number ?? 0) + 1;
  try {
    await db.entry.create({ data: { categoryId, participantId, number } });
  } catch (e) {
    return friendly(e, "entry");
  }
  refresh(`/admin/categories/${categoryId}`, `/judge/${categoryId}`);
  return { ok: "Added." };
}

export async function setEntryNumber(entryId: string, number: number) {
  await requireAdmin();
  const e = await db.entry.update({ where: { id: entryId }, data: { number } });
  refresh(`/admin/categories/${e.categoryId}`, `/judge/${e.categoryId}`);
}

export async function removeEntry(entryId: string) {
  await requireAdmin();
  const n = await db.score.count({ where: { entryId } });
  if (n > 0) throw new Error("This entry already has scores and cannot be removed.");
  const e = await db.entry.delete({ where: { id: entryId } });
  refresh(`/admin/categories/${e.categoryId}`, `/judge/${e.categoryId}`);
}

// The admin's word on a tie the rules could not break. `order` lists entry
// ids from first to last.
export async function decideTie(categoryId: string, order: string[]) {
  await requireAdmin();
  await db.$transaction(order.map((id, i) => db.entry.update({ where: { id, categoryId }, data: { tieOrder: i + 1 } })));
  refresh(`/admin/categories/${categoryId}`, `/results/${categoryId}`, "/admin/championship");
}

export async function clearTie(categoryId: string) {
  await requireAdmin();
  await db.entry.updateMany({ where: { categoryId }, data: { tieOrder: null } });
  refresh(`/admin/categories/${categoryId}`, `/results/${categoryId}`, "/admin/championship");
}

export async function decideChampionshipTie(levelId: string, order: string[]) {
  await requireAdmin();
  await db.$transaction([
    db.championshipDecision.deleteMany({ where: { levelId } }),
    ...order.map((participantId, i) => db.championshipDecision.create({ data: { levelId, participantId, tieOrder: i + 1 } })),
  ]);
  refresh("/admin/championship", "/results");
}

// ---------- Judges ----------

export async function createJudge(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const name = str(form, "name");
  const password = str(form, "password");
  if (!name) return { error: "Give the judge a name." };
  if (password.length < 4) return { error: "Password must have at least 4 characters." };
  const last = await db.judge.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" } });
  try {
    await db.judge.create({ data: { eventId, name, passwordHash: await hashPassword(password), sortOrder: (last?.sortOrder ?? 0) + 1 } });
  } catch (e) {
    return friendly(e, "judge");
  }
  refresh("/admin/judges");
  return { ok: `Judge "${name}" created.` };
}

export async function updateJudge(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  const password = str(form, "password");
  if (!name) return { error: "Give the judge a name." };
  if (password && password.length < 4) return { error: "Password must have at least 4 characters." };
  try {
    await db.judge.update({
      where: { id },
      data: {
        name,
        sortOrder: int(form, "sortOrder"),
        active: form.get("active") === "on",
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
    });
  } catch (e) {
    return friendly(e, "judge");
  }
  refresh("/admin/judges");
  return { ok: password ? "Saved, with a new password." : "Saved." };
}

export async function deleteJudge(id: string) {
  await requireAdmin();
  const n = await db.score.count({ where: { judgeId: id } });
  if (n > 0) throw new Error("This judge already has scores. Deactivate instead of deleting.");
  await db.judge.delete({ where: { id } });
  refresh("/admin/judges");
}

// ---------- Criteria ----------

export async function createCriterion(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const eventId = str(form, "eventId");
  const name = str(form, "name");
  if (!name) return { error: "Give the criterion a name." };
  const last = await db.criterion.findFirst({ where: { eventId }, orderBy: { priority: "desc" } });
  try {
    await db.criterion.create({ data: { eventId, name, maxPoints: int(form, "maxPoints", 10) || 10, priority: (last?.priority ?? 0) + 1 } });
  } catch (e) {
    return friendly(e, "criterion");
  }
  refresh("/admin/criteria");
  return { ok: `Criterion "${name}" created.` };
}

export async function updateCriterion(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the criterion a name." };
  try {
    await db.criterion.update({ where: { id }, data: { name, maxPoints: int(form, "maxPoints", 10) || 10 } });
  } catch (e) {
    return friendly(e, "criterion");
  }
  refresh("/admin/criteria");
  return { ok: "Saved." };
}

export async function moveCriterion(id: string, direction: -1 | 1) {
  await requireAdmin();
  const c = await db.criterion.findUnique({ where: { id } });
  if (!c) return;
  const all = await db.criterion.findMany({ where: { eventId: c.eventId }, orderBy: { priority: "asc" } });
  const i = all.findIndex((x) => x.id === id);
  const j = i + direction;
  if (j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((x, k) => db.criterion.update({ where: { id: x.id }, data: { priority: k + 1 } })));
  refresh("/admin/criteria");
}

export async function deleteCriterion(id: string) {
  await requireAdmin();
  const n = await db.score.count({ where: { criterionId: id } });
  if (n > 0) throw new Error("This criterion already has scores and cannot be deleted.");
  await db.criterion.delete({ where: { id } });
  refresh("/admin/criteria");
}

// ---------- Admin account ----------

export async function changeAdminPassword(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 8) return { error: "New password must have at least 8 characters." };
  const row = await db.admin.findUnique({ where: { id: admin.id } });
  if (!row || !(await checkPassword(current, row.passwordHash))) return { error: "Current password is wrong." };
  await db.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Password changed." };
}

export async function createAdmin(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const email = str(form, "email").toLowerCase();
  const name = str(form, "name");
  const password = String(form.get("password") ?? "");
  if (!email || !name) return { error: "Email and name are required." };
  if (password.length < 8) return { error: "Password must have at least 8 characters." };
  try {
    await db.admin.create({ data: { email, name, passwordHash: await hashPassword(password) } });
  } catch (e) {
    return friendly(e, "admin");
  }
  refresh("/admin/settings");
  return { ok: `Admin "${name}" created.` };
}
