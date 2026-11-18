import Link from "next/link";
import { ActionForm } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { orderAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { LICENCES, type LicenceType } from "@/lib/constants";
import { date, pkr } from "@/lib/utils";

export const metadata = { title: "Orders · Admin" };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "pending_payment", q } = await searchParams;
  const { supabase } = await requireAdmin();
  let query = supabase
    .from("orders")
    .select("*, order_items(beat_title, producer_name, licence_type, price_pkr)")
    .eq("status", status)
    .gt("total_pkr", 0)
    .order("created_at", { ascending: status === "pending_payment" })
    .limit(100);
  if (q) query = query.ilike("order_number", `%${q.trim()}%`);
  const { data: orders } = await query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["pending_payment", "paid", "refunded", "cancelled"].map((s) => (
          <Link key={s} href={`?status=${s}`} className={s === status ? "btn-primary" : "btn-ghost"}>{s.replace("_", " ")}</Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="SB-…" className="input w-40 font-mono" />
          <button className="btn-ghost">Find</button>
        </form>
      </div>
      {status === "pending_payment" && (
        <p className="text-sm text-muted">Match the reference/transaction ID with your bank or wallet statement, then mark as paid. Large orders: double-check before confirming.</p>
      )}
      {!orders?.length && <p className="card p-8 text-center text-muted">No orders.</p>}
      {orders?.map((o) => (
        <div key={o.id} className="card space-y-2 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg text-saffron">{o.order_number}</span>
            <StatusBadge status={o.status} />
            <span className="font-semibold">{pkr(o.total_pkr)}</span>
            <span className="text-sm text-muted">{o.buyer_name} · {o.buyer_email} · {date(o.created_at)}</span>
          </div>
          <div className="text-sm">
            Buyer&apos;s transaction ref: <b className="font-mono">{o.payment_reference || "— not submitted yet —"}</b>
          </div>
          <ul className="text-sm text-muted">
            {o.order_items.map((i: { beat_title: string; producer_name: string; licence_type: LicenceType; price_pkr: number }, n: number) => (
              <li key={n}>{i.beat_title} ({i.producer_name}) · {LICENCES[i.licence_type].name} · {pkr(i.price_pkr)}</li>
            ))}
          </ul>
          {o.admin_note && <p className="text-xs text-muted">Note: {o.admin_note}</p>}
          {(o.status === "pending_payment" || o.status === "paid") && (
            <ActionForm action={orderAction} className="flex flex-wrap items-center gap-2 border-t border-line pt-3"
              confirm={o.status === "paid" ? "Refund this order? Licences will be revoked and producer earnings reversed." : undefined}>
              <input type="hidden" name="order_id" value={o.id} />
              <input name="note" placeholder="Internal note (bank ref, reason…)" className="input max-w-sm" />
              {o.status === "pending_payment" ? (
                <>
                  <button name="action" value="paid" className="btn-primary">Mark paid</button>
                  <button name="action" value="cancel" className="btn-ghost">Cancel</button>
                </>
              ) : (
                <button name="action" value="refund" className="btn-danger">Refund</button>
              )}
            </ActionForm>
          )}
        </div>
      ))}
    </div>
  );
}
