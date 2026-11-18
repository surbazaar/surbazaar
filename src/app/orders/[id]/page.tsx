import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { cancelOrder, submitReference } from "@/app/actions/shop";
import { requireUser } from "@/lib/auth";
import { LICENCE_FILES, LICENCES, type LicenceType } from "@/lib/constants";
import { date, pkr } from "@/lib/utils";

export const metadata = { title: "Order" };

type Item = {
  id: string; beat_id: string; beat_title: string; producer_name: string; licence_type: LicenceType;
  price_pkr: number; licence_code: string;
  beat: { has_mp3: boolean; has_wav: boolean; has_stems: boolean; preview_path: string | null } | null;
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser(`/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(id, beat_id, beat_title, producer_name, licence_type, price_pkr, licence_code, beat:beats(has_mp3, has_wav, has_stems, preview_path))")
    .eq("id", id)
    .eq("buyer_id", user.id)
    .maybeSingle();
  if (!order) notFound();
  const items = order.order_items as Item[];
  const { data: s } = await supabase.from("site_settings").select("*").single();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="h-display text-4xl">Order <span className="font-mono text-3xl text-saffron">{order.order_number}</span></h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="text-sm text-muted">Placed {date(order.created_at)} · Licensee: <b className="text-sand">{order.buyer_name}</b></p>

      {order.status === "pending_payment" && (
        <div className="card space-y-4 border-saffron/50 p-6">
          <h2 className="text-lg font-semibold">Pay {pkr(order.total_pkr)} to complete your order</h2>
          <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[160px_1fr]">
            {s?.bank_name && (<><dt className="text-muted">Bank</dt><dd>{s.bank_name}</dd></>)}
            {s?.account_title && (<><dt className="text-muted">Account title</dt><dd>{s.account_title}</dd></>)}
            {s?.iban && (<><dt className="text-muted">IBAN</dt><dd className="font-mono">{s.iban}</dd></>)}
            {s?.raast_id && (<><dt className="text-muted">Raast ID</dt><dd className="font-mono">{s.raast_id}</dd></>)}
            {s?.jazzcash && (<><dt className="text-muted">JazzCash</dt><dd className="font-mono">{s.jazzcash}</dd></>)}
            {s?.easypaisa && (<><dt className="text-muted">Easypaisa</dt><dd className="font-mono">{s.easypaisa}</dd></>)}
            <dt className="text-muted">Reference</dt><dd className="font-mono font-bold text-saffron">{order.order_number}</dd>
          </dl>
          {!s?.iban && !s?.raast_id && !s?.jazzcash && !s?.easypaisa && (
            <p className="text-sm text-henna">Payment details are being set up. Please check back shortly.</p>
          )}
          {s?.payment_note && <p className="text-sm text-muted">{s.payment_note}</p>}
          <ActionForm action={submitReference} className="space-y-2 border-t border-line pt-4">
            <input type="hidden" name="order_id" value={order.id} />
            <label className="label" htmlFor="reference">After paying, enter the transaction ID</label>
            <div className="flex gap-2">
              <input id="reference" name="reference" defaultValue={order.payment_reference ?? ""} required className="input" placeholder="e.g. TID 0123456789" />
              <Submit>Submit</Submit>
            </div>
          </ActionForm>
          <form action={cancelOrder}>
            <input type="hidden" name="order_id" value={order.id} />
            <button className="text-xs text-muted hover:text-henna">Cancel this order</button>
          </form>
        </div>
      )}

      {order.status === "refunded" && (
        <div className="card border-henna/50 p-4 text-sm text-henna">This order was refunded. Its licences are no longer valid.</div>
      )}

      <div className="space-y-3">
        {items.map((i) => {
          const files = i.licence_type === "free" ? [] : LICENCE_FILES[i.licence_type].filter((f) => i.beat?.[`has_${f}`]);
          return (
            <div key={i.id} className="card p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <Link href={`/beats/${i.beat_id}`} className="font-semibold hover:text-saffron">{i.beat_title}</Link>
                  <span className="text-sm text-muted"> · {i.producer_name}</span>
                </div>
                <span className="font-semibold">{pkr(i.price_pkr)}</span>
              </div>
              <div className="mt-1 text-xs text-muted">{LICENCES[i.licence_type].name} · code <span className="font-mono">{i.licence_code}</span></div>
              {order.status === "paid" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`/api/licence/${i.licence_code}`} className="btn-primary">Licence PDF</a>
                  {i.licence_type === "free" && <a href={`/api/download?item=${i.id}&file=preview`} className="btn-ghost">Tagged MP3</a>}
                  {files.map((f) => (
                    <a key={f} href={`/api/download?item=${i.id}&file=${f}`} className="btn-ghost">
                      {f === "stems" ? "Stems (ZIP)" : f.toUpperCase()}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {order.status === "paid" && <p className="text-xs text-muted">Download links are generated fresh each time and expire after a few minutes.</p>}
    </div>
  );
}
