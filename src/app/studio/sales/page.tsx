import { requireProducer } from "@/lib/auth";
import { LICENCES, type LicenceType } from "@/lib/constants";
import { date, pkr } from "@/lib/utils";

export const metadata = { title: "Sales" };

export default async function SalesPage() {
  const { supabase, user } = await requireProducer();
  const { data } = await supabase
    .from("order_items")
    .select("id, beat_title, licence_type, price_pkr, platform_fee_pkr, producer_earning_pkr, licence_code, order:orders!inner(order_number, buyer_name, status, paid_at)")
    .eq("producer_id", user.id)
    .in("order.status", ["paid", "refunded"])
    .order("created_at", { ascending: false })
    .limit(200);
  type Row = NonNullable<typeof data>[number] & { order: { order_number: string; buyer_name: string; status: string; paid_at: string } };
  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-4">
      <h1 className="h-display text-3xl">Sales</h1>
      {!rows.length ? (
        <p className="card p-8 text-center text-muted">No sales yet. Share your store link on Instagram to get your first one.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Beat</th><th>Licence</th><th>Licensee</th><th>Price</th><th>Fee</th><th>You earn</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.order.status === "refunded" ? "line-through opacity-60" : ""}>
                  <td className="text-muted">{date(r.order.paid_at)}</td>
                  <td>{r.beat_title}</td>
                  <td>{LICENCES[r.licence_type as LicenceType].name}</td>
                  <td>{r.order.buyer_name}</td>
                  <td>{pkr(r.price_pkr)}</td>
                  <td className="text-muted">{r.price_pkr ? pkr(r.platform_fee_pkr) : "—"}</td>
                  <td className="font-semibold text-teal">{r.price_pkr ? pkr(r.producer_earning_pkr) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
