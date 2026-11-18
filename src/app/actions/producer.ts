"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/forms";
import { LICENCE_ORDER, type LicenceType } from "@/lib/constants";
import { errMsg, slugify } from "@/lib/utils";

async function me() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/sell");
  return { supabase, user: data.user };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function applyProducer(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!fd.get("agree")) return { error: "You must accept the producer agreement." };
  const samples = [str(fd, "sample1"), str(fd, "sample2"), str(fd, "sample3")].filter(Boolean);
  if (samples.length < 3) return { error: "Please share links to 3 sample beats (SoundCloud, YouTube, Drive…)." };
  if (samples.some((s) => !/^https?:\/\//i.test(s))) return { error: "Sample links must start with http:// or https://" };
  const stage = str(fd, "stage_name");
  const slug = slugify(str(fd, "slug") || stage);
  if (slug.length < 2) return { error: "Choose a store link with at least 2 letters." };

  const { data: existing } = await supabase.from("producer_profiles").select("user_id").eq("user_id", user.id).maybeSingle();
  const profile = { user_id: user.id, stage_name: stage, slug, city: str(fd, "city") || null, bio: str(fd, "bio") || null, sample_links: samples };
  const { error } = existing
    ? await supabase.from("producer_profiles").update(profile).eq("user_id", user.id)
    : await supabase.from("producer_profiles").insert(profile);
  if (error) return { error: errMsg(error) };

  const priv = {
    user_id: user.id,
    legal_name: str(fd, "legal_name"),
    cnic: str(fd, "cnic"),
    phone: str(fd, "phone"),
    payout_method: str(fd, "payout_method") || "jazzcash",
    payout_account_title: str(fd, "payout_account_title") || null,
    payout_account: str(fd, "payout_account") || null,
  };
  const { error: e2 } = await supabase.from("producer_private").upsert(priv, { onConflict: "user_id" });
  if (e2) return { error: errMsg(e2) };
  revalidatePath("/sell");
  return { ok: "Application submitted! We review new producers within 2–3 days." };
}

export async function updateStore(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await me();
  const { error } = await supabase
    .from("producer_profiles")
    .update({ stage_name: str(fd, "stage_name"), city: str(fd, "city") || null, bio: str(fd, "bio") || null })
    .eq("user_id", user.id);
  if (error) return { error: errMsg(error) };
  revalidatePath("/studio");
  return { ok: "Store updated." };
}

export async function updatePayoutSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase, user } = await me();
  const { error } = await supabase
    .from("producer_private")
    .update({
      payout_method: str(fd, "payout_method"),
      payout_account_title: str(fd, "payout_account_title") || null,
      payout_account: str(fd, "payout_account") || null,
      phone: str(fd, "phone"),
    })
    .eq("user_id", user.id);
  if (error) return { error: errMsg(error) };
  revalidatePath("/studio/wallet");
  return { ok: "Payout details saved." };
}

export async function requestPayout(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await me();
  const { error } = await supabase.rpc("request_payout", { p_amount: Math.floor(Number(fd.get("amount"))) });
  if (error) return { error: errMsg(error) };
  revalidatePath("/studio/wallet");
  return { ok: "Payout requested. Payouts are sent every Thursday." };
}

export async function updateBeat(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await me();
  const id = str(fd, "beat_id");
  const bpm = Number(fd.get("bpm")) || null;
  const { data: files } = await supabase.from("beats").select("has_mp3, has_wav, has_stems").eq("id", id).single();
  const needs: Record<string, ("has_mp3" | "has_wav" | "has_stems")[]> = {
    basic: ["has_mp3"], premium: ["has_mp3", "has_wav"], unlimited: ["has_wav", "has_stems"], exclusive: ["has_wav", "has_stems"],
  };
  for (const [t, req] of Object.entries(needs)) {
    if (fd.get(`lic_${t}`) && req.some((k) => !files?.[k])) {
      return { error: `The ${t} licence needs files this beat doesn't have (${req.map((k) => k.slice(4)).join(", ")}).` };
    }
  }
  const { error } = await supabase
    .from("beats")
    .update({
      title: str(fd, "title"),
      description: str(fd, "description") || null,
      genre: str(fd, "genre"),
      moods: fd.getAll("moods").map(String),
      instruments: fd.getAll("instruments").map(String),
      tags: str(fd, "tags").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 15),
      bpm,
      musical_key: str(fd, "musical_key") || null,
      ai_generated: !!fd.get("ai_generated"),
      ai_tool: str(fd, "ai_tool") || null,
    })
    .eq("id", id);
  if (error) return { error: errMsg(error) };

  for (const t of LICENCE_ORDER as LicenceType[]) {
    const enabled = !!fd.get(`lic_${t}`);
    const price = t === "free" ? 0 : Math.floor(Number(fd.get(`price_${t}`)) || 0);
    if (enabled && t !== "free" && price <= 0) return { error: `Set a price for the ${t} licence.` };
    const { error: le } = enabled
      ? await supabase.from("beat_licences").upsert({ beat_id: id, licence_type: t, price_pkr: price, enabled: true }, { onConflict: "beat_id,licence_type" })
      : await supabase.from("beat_licences").update({ enabled: false }).eq("beat_id", id).eq("licence_type", t);
    if (le) return { error: errMsg(le) };
  }
  revalidatePath(`/studio/beats/${id}`);
  revalidatePath("/studio");
  return { ok: "Saved. Edited beats go back to review before they're live again." };
}

export async function removeBeat(fd: FormData) {
  const { supabase } = await me();
  await supabase.from("beats").update({ status: "removed" }).eq("id", String(fd.get("beat_id")));
  revalidatePath("/studio");
  redirect("/studio");
}
