import Link from "next/link";
import { ActionForm } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { payoutAction } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { date, money } from "@/lib/utils";

export const metadata = { title: "Payouts · Admin" };

export default async function AdminPayouts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "requested" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: payouts } = await supabase
    .from("payouts")
    .select("*, producer:producer_profiles(stage_name, private:producer_private(legal_name, phone))")
    .eq("status", status)
    .order("created_at")
    .limit(200);
  const total = payouts?.reduce((s, p) => s + p.amount_pkr, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["requested", "paid", "rejected"].map((s) => (
          <Link key={s} href={`?status=${s}`} className={s === status ? "btn-primary" : "btn-ghost"}>{s}</Link>
        ))}
        <span className="ml-auto text-muted">{payouts?.length ?? 0} payouts · {money(total)}</span>
      </div>
      {status === "requested" && <p className="text-sm text-muted">Weekly batch (Thursday): send each transfer, then mark paid with the transaction ID as the note.</p>}
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Requested</th><th>Producer</th><th>Amount</th><th>Send to</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {payouts?.map((p) => (
              <tr key={p.id}>
                <td className="text-muted">{date(p.created_at)}</td>
                <td>{p.producer?.stage_name}<div className="text-xs text-muted">{p.producer?.private?.legal_name} · {p.producer?.private?.phone}</div></td>
                <td className="font-semibold">{money(p.amount_pkr)}</td>
                <td className="text-xs">{p.method}<div className="font-mono">{p.account}</div><div>{p.account_title}</div></td>
                <td><StatusBadge status={p.status} />{p.admin_note && <div className="text-xs text-muted">{p.admin_note}</div>}</td>
                <td>
                  {p.status === "requested" && (
                    <ActionForm action={payoutAction} className="flex flex-col gap-1">
                      <input type="hidden" name="payout_id" value={p.id} />
                      <input name="note" placeholder="Txn ID / reason" className="input" />
                      <div className="flex gap-1">
                        <button name="decision" value="paid" className="btn-primary">Paid</button>
                        <button name="decision" value="reject" className="btn-danger">Reject</button>
                      </div>
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
            {!payouts?.length && <tr><td colSpan={6} className="text-center text-muted">No payouts.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
