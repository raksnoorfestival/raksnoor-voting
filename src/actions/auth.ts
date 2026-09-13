"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword } from "@/lib/password";
import { setSession, clearSession } from "@/lib/session";
import { currentEvent } from "@/lib/event";

export type FormState = { error?: string } | undefined;

export async function adminLogin(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin || !(await checkPassword(password, admin.passwordHash))) return { error: "Wrong email or password." };
  await setSession({ role: "admin", id: admin.id, name: admin.name });
  redirect("/admin");
}

export async function judgeLogin(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const event = await currentEvent();
  if (!event) return { error: "There is no current event. Ask the organisation." };
  // Name match ignores case so a tablet with caps lock still gets in.
  const judge = await db.judge.findFirst({ where: { eventId: event.id, active: true, name: { equals: name, mode: "insensitive" } } });
  if (!judge || !(await checkPassword(password, judge.passwordHash))) return { error: "Wrong name or password." };
  await setSession({ role: "judge", id: judge.id, name: judge.name, eventId: event.id });
  redirect("/judge");
}

export async function publicLogin(_: FormState, form: FormData): Promise<FormState> {
  const password = String(form.get("password") ?? "").trim();
  const event = await currentEvent();
  if (!event) return { error: "There is no current event." };
  if (!event.publicPassword) return { error: "Results are not open yet." };
  if (password !== event.publicPassword) return { error: "Wrong password." };
  await setSession({ role: "public", eventId: event.id });
  redirect("/results");
}

export async function logout(role: "admin" | "judge" | "public") {
  await clearSession(role);
  redirect(role === "admin" ? "/admin/login" : role === "judge" ? "/judge/login" : "/results/login");
}
