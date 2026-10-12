"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { checkPassword } from "@/lib/password";
import { setSession, clearSession } from "@/lib/session";
import { currentEvent } from "@/lib/event";
import { guarded } from "@/lib/login-guard";
import { matchJudge } from "@/lib/judge-name";

export type FormState = { error?: string } | undefined;

export async function adminLogin(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const admin = await db.admin.findUnique({ where: { email } });
  const error = await guarded("admin", email, async () => !!admin && (await checkPassword(password, admin.passwordHash)), "Wrong email or password.");
  if (error) return { error };
  await setSession({ role: "admin", id: admin!.id, name: admin!.name });
  redirect("/admin");
}

export async function judgeLogin(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const event = await currentEvent();
  if (!event) return { error: "There is no current event. Ask the organisation." };
  const judge = matchJudge(await db.judge.findMany({ where: { eventId: event.id, active: true } }), name);
  const error = await guarded("judge", name, async () => !!judge && (await checkPassword(password, judge.passwordHash)), "Wrong name or password.");
  if (error) return { error };
  await setSession({ role: "judge", id: judge!.id, name: judge!.name, eventId: event.id });
  redirect("/judge");
}

// The public results sign-in is not a server action: see
// src/app/results/session/route.ts for why.

export async function logout(role: "admin" | "judge" | "public") {
  await clearSession(role);
  redirect(role === "admin" ? "/admin/login" : role === "judge" ? "/judge/login" : "/results/login");
}
