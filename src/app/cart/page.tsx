import Link from "next/link";
import { Artwork } from "@/components/beat-card";
import { ActionForm, Submit } from "@/components/forms";
import { checkout, removeFromCart } from "@/app/actions/shop";
import { requireUser } from "@/lib/auth";
import { LICENCES, type LicenceType } from "@/lib/constants";
import { pkr } from "@/lib/utils";

export const metadata = { title: "Cart" };

type Item = {
  beat_id: string;
  licence_type: LicenceType;
  beat: {
    title: string; status: string; artwork_path: string | null;
    producer: { stage_name: string };
    beat_licences: { licence_type: LicenceType; price_pkr: number; enabled: boolean }[];
  };
};

export default async function CartPage() {
  const { supabase, profile } = await requireUser("/cart");
  const { data } = await supabase
    .from("cart_items")
    .select("beat_id, licence_type, beat:beats(title, status, artwork_path, producer:producer_profiles(stage_name), beat_licences(licence_type, price_pkr, enabled))")
    .order("created_at");
  const items = (data ?? []) as unknown as Item[];
  const rows = items.map((i) => {
    const l = i.beat.beat_licences.find((x) => x.licence_type === i.licence_type && x.enabled);
    return { ...i, price: l?.price_pkr ?? null, ok: i.beat.status === "approved" && !!l };
  });
  const total = rows.filter((r) => r.ok).reduce((s, r) => s + (r.price ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="h-display text-4xl">Cart</h1>
      {!rows.length ? (
        <div className="card p-8 text-center text-muted">
          Your cart is empty. <Link href="/beats" className="link">Browse beats</Link>
        </div>
      ) : (
        <>
          <div className="card divide-y divide-line">
            {rows.map((r) => (
              <div key={r.beat_id} className="flex items-center gap-4 p-4">
                <div className="w-16 shrink-0 overflow-hidden rounded-lg"><Artwork path={r.beat.artwork_path} title={r.beat.title} /></div>
                <div className="min-w-0 flex-1">
                  <Link href={`/beats/${r.beat_id}`} className="font-semibold hover:text-saffron">{r.beat.title}</Link>
                  <div className="text-xs text-muted">{r.beat.producer.stage_name} · {LICENCES[r.licence_type].name} ({LICENCES[r.licence_type].files})</div>
                  {!r.ok && <div className="text-xs text-henna">No longer available — remove it to continue.</div>}
                </div>
                <div className="font-semibold">{pkr(r.price)}</div>
                <form action={removeFromCart}>
                  <input type="hidden" name="beat_id" value={r.beat_id} />
                  <button className="text-xs text-muted hover:text-henna">Remove</button>
                </form>
              </div>
            ))}
            <div className="flex justify-between p-4 text-lg font-semibold">
              <span>Total</span><span className="text-saffron">{pkr(total)}</span>
            </div>
          </div>

          <ActionForm action={checkout} className="card space-y-4 p-6">
            <h2 className="font-semibold">Checkout</h2>
            <div>
              <label className="label" htmlFor="buyer_name">Licensee name (printed on your licence)</label>
              <input id="buyer_name" name="buyer_name" required defaultValue={profile.display_name} className="input" />
              <p className="mt-1 text-xs text-muted">Use your legal or artist name — this is who holds the rights.</p>
            </div>
            <div className="rounded-lg border border-line bg-panel-2 p-3 text-sm text-muted">
              <b className="text-sand">Payment:</b> bank transfer, Raast, JazzCash or Easypaisa. You&apos;ll get the account
              details and your order number on the next page. Downloads unlock as soon as we confirm payment.
            </div>
            <label className="flex items-start gap-2 text-sm text-muted">
              <input type="checkbox" name="agree" required className="mt-1 accent-saffron" />
              <span>I accept the <Link href="/licences" className="link">licence terms</Link> for the items above.</span>
            </label>
            <Submit>Place order · {pkr(total)}</Submit>
          </ActionForm>
        </>
      )}
    </div>
  );
}
