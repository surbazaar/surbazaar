import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { reviewProducer, setProducerTerms } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { date } from "@/lib/utils";

export const metadata = { title: "Producers · Admin" };

export default async function AdminProducers({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: producers } = await supabase
    .from("producer_profiles")
    .select("*, private:producer_private(*), profile:profiles(email)")
    .eq("status", status)
    .order("created_at");
  const { count: founding } = await supabase.from("producer_profiles").select("*", { count: "exact", head: true }).eq("founding", true);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {["pending", "approved", "rejected", "suspended"].map((s) => (
          <Link key={s} href={`?status=${s}`} className={s === status ? "btn-primary" : "btn-ghost"}>{s}</Link>
        ))}
        <span className="ml-auto text-muted">Founding producers: {founding ?? 0} / 50</span>
      </div>
      {!producers?.length && <p className="card p-8 text-center text-muted">Nothing here.</p>}
      {producers?.map((p) => (
        <div key={p.user_id} className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">{p.stage_name}</h3>
            <StatusBadge status={p.status} />
            {p.founding && <span className="badge border-saffron/50 text-saffron">founding</span>}
            <span className="text-sm text-muted">{p.city} · applied {date(p.created_at)} · {p.profile?.email}</span>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="label">Samples</div>
              {p.sample_links.map((l: string) => <a key={l} href={l} target="_blank" rel="noreferrer" className="link block truncate">{l}</a>)}
              {p.bio && <p className="mt-2 text-muted">{p.bio}</p>}
            </div>
            <div>
              <div className="label">KYC & payout (private)</div>
              <p>{p.private?.legal_name} · CNIC <span className="font-mono">{p.private?.cnic}</span></p>
              <p>{p.private?.phone} · {p.private?.payout_method}: {p.private?.payout_account || "—"}</p>
            </div>
          </div>
          {p.status === "pending" || p.status === "rejected" ? (
            <ActionForm action={reviewProducer} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <input type="hidden" name="user_id" value={p.user_id} />
              <input name="note" placeholder="Note to producer (optional)" className="input max-w-sm" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="founding" defaultChecked={(founding ?? 0) < 50} className="accent-saffron" /> Founding (0% commission)</label>
              <button name="decision" value="approve" className="btn-primary">Approve</button>
              <button name="decision" value="reject" className="btn-danger">Reject</button>
            </ActionForm>
          ) : (
            <ActionForm action={setProducerTerms} className="flex flex-wrap items-end gap-2 border-t border-line pt-3 text-sm">
              <input type="hidden" name="user_id" value={p.user_id} />
              <label>Commission %<input name="commission" type="number" min={0} max={100} step={0.5} defaultValue={Number(p.commission_rate) * 100} className="input w-24" /></label>
              <label>Beat limit<input name="beat_limit" type="number" min={1} defaultValue={p.beat_limit} className="input w-24" /></label>
              <label>Status
                <select name="status" defaultValue={p.status} className="input">
                  <option value="approved">approved</option><option value="suspended">suspended</option>
                </select>
              </label>
              <label className="flex items-center gap-1"><input type="checkbox" name="founding" defaultChecked={p.founding} className="accent-saffron" /> Founding</label>
              <Submit className="btn-ghost">Save</Submit>
              <Link href={`/p/${p.slug}`} className="link ml-auto">Store</Link>
            </ActionForm>
          )}
        </div>
      ))}
    </div>
  );
}
