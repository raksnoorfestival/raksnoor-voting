import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Three kinds of visitor, three cookies. Each is a signed token so the
// server trusts nothing the browser could edit.
export type AdminSession = { role: "admin"; id: string; name: string };
export type JudgeSession = { role: "judge"; id: string; name: string; eventId: string };
export type PublicSession = { role: "public"; eventId: string };
type Session = AdminSession | JudgeSession | PublicSession;

const COOKIE: Record<Session["role"], string> = {
  admin: "rn_admin",
  judge: "rn_judge",
  public: "rn_public",
};
const MAX_AGE: Record<Session["role"], number> = {
  admin: 60 * 60 * 24 * 7,
  judge: 60 * 60 * 24,
  public: 60 * 60 * 24,
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing or too short");
  return new TextEncoder().encode(s);
}

export async function setSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE[session.role]}s`)
    .sign(secret());
  (await cookies()).set(COOKIE[session.role], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE[session.role],
    path: "/",
  });
}

export async function clearSession(role: Session["role"]) {
  (await cookies()).delete(COOKIE[role]);
}

async function read<T extends Session>(role: T["role"]): Promise<T | null> {
  const token = (await cookies()).get(COOKIE[role])?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== role) return null;
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export const getAdmin = () => read<AdminSession>("admin");
export const getJudge = () => read<JudgeSession>("judge");
export const getPublic = () => read<PublicSession>("public");

export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdmin();
  if (!s) redirect("/admin/login");
  return s;
}

export async function requireJudge(): Promise<JudgeSession> {
  const s = await getJudge();
  if (!s) redirect("/judge/login");
  return s;
}
