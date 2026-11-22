"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/forms";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function safeNext(n: FormDataEntryValue | null) {
  const s = typeof n === "string" ? n : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function signIn(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  });
  if (error) return { error: error.message === "Email not confirmed" ? "Please confirm your email first (check your inbox)." : "Wrong email or password." };
  redirect(safeNext(fd.get("next")));
}

export async function signUp(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const name = String(fd.get("name") ?? "").trim();
  const password = String(fd.get("password") ?? "");
  if (name.length < 2) return { error: "Please enter your name." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const requested = safeNext(fd.get("next"));
  const next = requested === "/" ? "/welcome" : requested;
  const { data, error } = await supabase.auth.signUp({
    email: String(fd.get("email") ?? "").trim(),
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(next);
  redirect(`/signup/check-email?email=${encodeURIComponent(String(fd.get("email") ?? "").trim())}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function sendReset(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(String(fd.get("email") ?? "").trim(), {
    redirectTo: `${await origin()}/auth/callback?next=/account`,
  });
  if (error) return { error: error.message };
  return { ok: "If that email has an account, a reset link is on its way." };
}

export async function updateAccount(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Not signed in" };
  const name = String(fd.get("name") ?? "").trim();
  if (name) {
    const { error } = await supabase.from("profiles").update({ display_name: name }).eq("id", data.user.id);
    if (error) return { error: error.message };
  }
  const password = String(fd.get("password") ?? "");
  if (password) {
    if (password.length < 8) return { error: "Password must be at least 8 characters." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  }
  return { ok: "Saved." };
}
