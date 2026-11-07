"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, normalizeEmail, requestLoginCode, verifyLoginCode } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/utils";

export type SignInState = { email?: string; error?: string };

export async function signInAction(_: SignInState, form: FormData): Promise<SignInState> {
  const parsed = z.email().safeParse(normalizeEmail(String(form.get("email") ?? "")));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const email = parsed.data;

  const code = form.get("code");
  if (typeof code !== "string") {
    const sent = await requestLoginCode(email);
    return sent ? { email } : { error: "Too many codes requested. Try again in a few minutes." };
  }

  if (!(await verifyLoginCode(email, code))) {
    return { email, error: "That code is wrong or expired." };
  }
  redirect(safeRedirectPath(form.get("next")));
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}
