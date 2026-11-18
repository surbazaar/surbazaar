"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/components/forms";
import { errMsg } from "@/lib/utils";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const note = (fd: FormData) => str(fd, "note") || null;

async function run(path: string, fn: (s: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{ error: unknown }>, ok: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await fn(supabase);
  if (error) return { error: errMsg(error) };
  revalidatePath(path);
  revalidatePath("/admin");
  return { ok };
}

export async function reviewProducer(_: ActionResult, fd: FormData) {
  const approve = fd.get("decision") === "approve";
  return run("/admin/producers", (s) =>
    s.rpc("admin_review_producer", {
      p_user: str(fd, "user_id"), p_approve: approve, p_note: note(fd), p_founding: !!fd.get("founding"),
    }), approve ? "Producer approved." : "Producer rejected.");
}

export async function reviewBeat(_: ActionResult, fd: FormData) {
  const approve = fd.get("decision") === "approve";
  return run("/admin/beats", (s) =>
    s.rpc("admin_review_beat", { p_beat: str(fd, "beat_id"), p_approve: approve, p_note: note(fd) }),
    approve ? "Beat is live." : "Beat rejected.");
}

export async function orderAction(_: ActionResult, fd: FormData) {
  const action = str(fd, "action");
  const fn = { paid: "admin_mark_order_paid", cancel: "admin_cancel_order", refund: "admin_refund_order" }[action];
  if (!fn) return { error: "Unknown action" };
  return run("/admin/orders", (s) => s.rpc(fn, { p_order: str(fd, "order_id"), p_note: note(fd) }), `Order updated (${action}).`);
}

export async function payoutAction(_: ActionResult, fd: FormData) {
  const paid = fd.get("decision") === "paid";
  return run("/admin/payouts", (s) =>
    s.rpc("admin_process_payout", { p_payout: str(fd, "payout_id"), p_paid: paid, p_note: note(fd) }),
    paid ? "Marked as paid." : "Payout rejected and returned to wallet.");
}

export async function reportAction(_: ActionResult, fd: FormData) {
  const status = str(fd, "status");
  const supabase = await createClient();
  if (fd.get("takedown")) {
    const { error } = await supabase.rpc("admin_review_beat", { p_beat: str(fd, "beat_id"), p_approve: false, p_note: "Removed after a report: " + (note(fd) ?? "") });
    if (error) return { error: errMsg(error) };
  }
  return run("/admin/reports", (s) => s.from("reports").update({ status }).eq("id", str(fd, "report_id")), "Report updated.");
}

export async function saveSettings(_: ActionResult, fd: FormData) {
  const fields = ["bank_name", "account_title", "iban", "raast_id", "jazzcash", "easypaisa", "payment_note"];
  const row = Object.fromEntries(fields.map((f) => [f, str(fd, f)]));
  return run("/admin/settings", (s) => s.from("site_settings").update({ ...row, updated_at: new Date().toISOString() }).eq("id", 1), "Settings saved.");
}

export async function setProducerTerms(_: ActionResult, fd: FormData) {
  const rate = Number(fd.get("commission")) / 100;
  const limit = Math.floor(Number(fd.get("beat_limit")));
  if (!(rate >= 0 && rate <= 1) || !(limit > 0)) return { error: "Invalid values" };
  return run("/admin/producers", (s) =>
    s.from("producer_profiles").update({ commission_rate: rate, beat_limit: limit, founding: !!fd.get("founding"), status: str(fd, "status") }).eq("user_id", str(fd, "user_id")),
    "Producer updated.");
}
