import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { requestPayout, updatePayoutSettings } from "@/app/actions/producer";
import { requireProducer } from "@/lib/auth";
import { HOLD_DAYS, MIN_PAYOUT } from "@/lib/constants";
import { date, money, pkr } from "@/lib/utils";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const { supabase, user } = await requireProducer();
  const [{ data: wallet }, { data: priv }, { data: payouts }, { data: entries }] = await Promise.all([
    supabase.rpc("wallet_summary"),
    supabase.from("producer_private").select("*").eq("user_id", user.id).single(),
    supabase.from("payouts").select("*").eq("producer_id", user.id).order("created_at", { ascending: false }),
    supabase.from("wallet_entries").select("*").eq("producer_id", user.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const w = wallet?.[0] ?? { available_pkr: 0, on_hold_pkr: 0 };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="card p-6">
          <div className="text-xs tracking-wide text-muted uppercase">Available to withdraw</div>
          <div className="mt-1 text-3xl font-semibold text-saffron">{money(w.available_pkr)}</div>
          <div className="mt-1 text-sm text-muted">+ {money(w.on_hold_pkr)} on hold (sales clear after {HOLD_DAYS} days)</div>
          <ActionForm action={requestPayout} className="mt-5 flex gap-2">
            <input name="amount" type="number" min={MIN_PAYOUT} max={Math.max(MIN_PAYOUT, w.available_pkr)} defaultValue={w.available_pkr >= MIN_PAYOUT ? w.available_pkr : ""} required className="input" placeholder={`Min ${MIN_PAYOUT}`} />
            <Submit>Request payout</Submit>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Minimum {pkr(MIN_PAYOUT)}. Payouts are sent in one batch every Thursday.</p>
        </div>

        <ActionForm action={updatePayoutSettings} className="card space-y-4 p-6">
          <h2 className="font-semibold">Payout details</h2>
          <select name="payout_method" defaultValue={priv?.payout_method} className="input">
            <option value="jazzcash">JazzCash</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="bank">Bank account (IBAN)</option>
          </select>
          <input name="payout_account_title" defaultValue={priv?.payout_account_title ?? ""} placeholder="Account title" className="input" />
          <input name="payout_account" defaultValue={priv?.payout_account ?? ""} placeholder="Wallet number / IBAN" className="input" required />
          <input name="phone" defaultValue={priv?.phone ?? ""} placeholder="Mobile" className="input" required />
          <Submit>Save</Submit>
        </ActionForm>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="h-display text-2xl">Payouts</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Requested</th><th>Amount</th><th>To</th><th>Status</th></tr></thead>
              <tbody>
                {payouts?.map((p) => (
                  <tr key={p.id}>
                    <td className="text-muted">{date(p.created_at)}</td>
                    <td>{pkr(p.amount_pkr)}</td>
                    <td className="text-xs">{p.method} · {p.account}</td>
                    <td><StatusBadge status={p.status} />{p.admin_note && <div className="text-xs text-muted">{p.admin_note}</div>}</td>
                  </tr>
                ))}
                {!payouts?.length && <tr><td colSpan={4} className="text-center text-muted">No payouts yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className="h-display text-2xl">Statement</h2>
          <div className="card mt-3 overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Clears</th></tr></thead>
              <tbody>
                {entries?.map((e) => (
                  <tr key={e.id}>
                    <td className="text-muted">{date(e.created_at)}</td>
                    <td>{e.kind.replace("_", " ")}</td>
                    <td className={e.amount_pkr < 0 ? "text-henna" : "text-teal"}>{e.amount_pkr < 0 ? "−" : "+"}PKR {Math.abs(e.amount_pkr).toLocaleString()}</td>
                    <td className="text-muted">{e.kind === "sale" ? date(e.available_at) : "—"}</td>
                  </tr>
                ))}
                {!entries?.length && <tr><td colSpan={4} className="text-center text-muted">Nothing yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
