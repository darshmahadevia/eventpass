import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const SESSION_COOKIE = "ep_session";
const SESSION_DAYS = 30;
const CODE_MINUTES = 10;
const MAX_CODES_PER_WINDOW = 5;
const MAX_ATTEMPTS = 5;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Emails a 6-digit sign-in code. Returns false when the address is rate limited. */
export async function requestLoginCode(email: string): Promise<boolean> {
  const since = new Date(Date.now() - CODE_MINUTES * 60_000);
  const [recent] = await db
    .select({ n: count() })
    .from(schema.loginCodes)
    .where(and(eq(schema.loginCodes.email, email), gt(schema.loginCodes.createdAt, since)));
  if ((recent?.n ?? 0) >= MAX_CODES_PER_WINDOW) return false;

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.insert(schema.loginCodes).values({
    email,
    codeHash: sha256(code),
    expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
  });
  await sendEmail({
    to: email,
    subject: `Your EventPass sign-in code: ${code}`,
    text: `Your sign-in code is ${code}. It expires in ${CODE_MINUTES} minutes.\n\nIf you didn't try to sign in, you can ignore this email.`,
  });
  return true;
}

/** Checks the newest live code for the email and starts a session on success. */
export async function verifyLoginCode(email: string, code: string): Promise<boolean> {
  const [row] = await db
    .select()
    .from(schema.loginCodes)
    .where(and(eq(schema.loginCodes.email, email), gt(schema.loginCodes.expiresAt, new Date())))
    .orderBy(desc(schema.loginCodes.createdAt))
    .limit(1);
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;

  await db
    .update(schema.loginCodes)
    .set({ attempts: row.attempts + 1 })
    .where(eq(schema.loginCodes.id, row.id));

  const expected = Buffer.from(row.codeHash);
  const actual = Buffer.from(sha256(code.trim()));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;

  await db.delete(schema.loginCodes).where(eq(schema.loginCodes.email, email));
  const [user] = await db
    .insert(schema.users)
    .values({ email })
    .onConflictDoUpdate({ target: schema.users.email, set: { email } })
    .returning();
  if (!user) return false;
  await startSession(user.id);
  return true;
}

export async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  await db.insert(schema.sessions).values({ tokenHash: sha256(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export type User = { id: string; email: string };

export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(
      and(eq(schema.sessions.tokenHash, sha256(token)), gt(schema.sessions.expiresAt, new Date())),
    );
  return row ?? null;
});

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}
