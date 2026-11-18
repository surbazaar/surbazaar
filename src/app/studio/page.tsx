import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { updateStore } from "@/app/actions/producer";
import { requireProducer } from "@/lib/auth";
import { genreLabel } from "@/lib/constants";
import { date, money, pkr } from "@/lib/utils";

export const metadata = { title: "Studio" };

export default async function StudioPage() {
  const { supabase, user, producer } = await requireProducer();
  const [{ data: beats }, { data: wallet }] = await Promise.all([
    supabase.from("beats").select("id, title, genre, status, plays, review_note, created_at, beat_licences(price_pkr, enabled)").eq("producer_id", user.id).order("created_at", { ascending: false }),
    supabase.rpc("wallet_summary"),
  ]);
  const w = wallet?.[0];
  const active = beats?.filter((b) => !["removed", "rejected"].includes(b.status)).length ?? 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Available" value={money(w?.available_pkr)} />
        <Stat label="On 7-day hold" value={money(w?.on_hold_pkr)} />
        <Stat label="Lifetime earnings" value={money(w?.lifetime_pkr)} />
        <Stat label="Beats used" value={`${active} / ${producer.beat_limit}`} />
      </div>
      {producer.founding && (
        <p className="card border-saffron/50 p-4 text-sm text-saffron">
          Founding producer: you pay {Number(producer.commission_rate) * 100}% commission.
        </p>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h2 className="h-display text-2xl">Your beats</h2>
          <Link href="/studio/upload" className="btn-primary">Upload beat</Link>
        </div>
        {beats?.length ? (
          <div className="card mt-4 overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Title</th><th>Genre</th><th>From</th><th>Plays</th><th>Status</th><th>Uploaded</th></tr></thead>
              <tbody>
                {beats.map((b) => {
                  const prices = b.beat_licences.filter((l) => l.enabled && l.price_pkr > 0).map((l) => l.price_pkr);
                  return (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/studio/beats/${b.id}`} className="link">{b.title}</Link>
                        {b.review_note && <div className="text-xs text-muted">Review note: {b.review_note}</div>}
                      </td>
                      <td>{genreLabel(b.genre)}</td>
                      <td>{prices.length ? pkr(Math.min(...prices)) : "Free"}</td>
                      <td>{b.plays}</td>
                      <td><StatusBadge status={b.status} /></td>
                      <td className="text-muted">{date(b.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="card mt-4 p-8 text-center text-muted">No beats yet. Upload your first one!</p>
        )}
      </div>

      <details className="card p-6">
        <summary className="cursor-pointer font-semibold">Store profile · <Link href={`/p/${producer.slug}`} className="link">/p/{producer.slug}</Link></summary>
        <ActionForm action={updateStore} className="mt-4 space-y-4">
          <input name="stage_name" defaultValue={producer.stage_name} required className="input" />
          <input name="city" defaultValue={producer.city ?? ""} placeholder="City" className="input" />
          <textarea name="bio" rows={3} defaultValue={producer.bio ?? ""} placeholder="Bio" className="input" />
          <Submit>Save</Submit>
        </ActionForm>
      </details>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
