"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/forms";
import { errMsg } from "@/lib/utils";

async function userOrLogin(next: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user: data.user };
}

export async function addToCart(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const beatId = String(fd.get("beat_id"));
  const licence = String(fd.get("licence") ?? "");
  const { supabase, user } = await userOrLogin(`/beats/${beatId}`);
  if (!licence || licence === "free") return { error: "Choose a paid licence." };
  const { error } = await supabase
    .from("cart_items")
    .upsert({ user_id: user.id, beat_id: beatId, licence_type: licence }, { onConflict: "user_id,beat_id" });
  if (error) return { error: errMsg(error) };
  revalidatePath("/", "layout");
  redirect("/cart");
}

export async function removeFromCart(fd: FormData) {
  const supabase = await createClient();
  await supabase.from("cart_items").delete().eq("beat_id", String(fd.get("beat_id")));
  revalidatePath("/", "layout");
}

export async function checkout(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await userOrLogin("/cart");
  if (!fd.get("agree")) return { error: "Please accept the licence terms." };
  const { data, error } = await supabase.rpc("create_order_from_cart", { p_buyer_name: String(fd.get("buyer_name") ?? "") });
  if (error) return { error: errMsg(error) };
  revalidatePath("/", "layout");
  redirect(`/orders/${data}`);
}

export async function claimFree(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const beatId = String(fd.get("beat_id"));
  const { supabase } = await userOrLogin(`/beats/${beatId}`);
  if (!fd.get("agree")) return { error: "Please accept the free licence terms." };
  const { data, error } = await supabase.rpc("claim_free_licence", {
    p_beat: beatId,
    p_buyer_name: String(fd.get("buyer_name") ?? ""),
  });
  if (error) return { error: errMsg(error) };
  redirect(`/orders/${data}`);
}

export async function submitReference(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const orderId = String(fd.get("order_id"));
  const ref = String(fd.get("reference") ?? "").trim();
  if (ref.length < 4) return { error: "Enter the transaction ID / reference from your bank or wallet." };
  const { error } = await supabase.rpc("submit_payment_reference", { p_order: orderId, p_reference: ref });
  if (error) return { error: errMsg(error) };
  revalidatePath(`/orders/${orderId}`);
  return { ok: "Thanks! We'll confirm your payment shortly, usually within a few hours." };
}

export async function cancelOrder(fd: FormData) {
  const supabase = await createClient();
  const orderId = String(fd.get("order_id"));
  await supabase.rpc("cancel_my_order", { p_order: orderId });
  revalidatePath(`/orders/${orderId}`);
}

export async function reportBeat(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = String(fd.get("email") ?? "").trim() || data.user?.email || null;
  const { error } = await supabase.from("reports").insert({
    beat_id: String(fd.get("beat_id")),
    reporter_id: data.user?.id ?? null,
    reporter_email: email,
    reason: String(fd.get("reason")),
    details: String(fd.get("details") ?? "").slice(0, 2000),
  });
  if (error) return { error: errMsg(error) };
  return { ok: "Report received. Our team reviews every report within 48 hours." };
}
