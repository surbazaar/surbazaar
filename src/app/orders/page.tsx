import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { date, pkr } from "@/lib/utils";
import { StatusBadge } from "@/components/status";

export const metadata = { title: "My licences" };

export default async function OrdersPage() {
  const { supabase, user } = await requireUser("/orders");
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total_pkr, created_at, order_items(beat_title, licence_type)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="h-display text-4xl">My licences</h1>
      {!orders?.length ? (
        <div className="card p-8 text-center text-muted">No orders yet. <Link href="/beats" className="link">Find a beat</Link></div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Order</th><th>Beats</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orders/${o.id}`} className="link font-mono">{o.order_number}</Link></td>
                  <td>{o.order_items.map((i) => i.beat_title).join(", ")}</td>
                  <td>{pkr(o.total_pkr)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="text-muted">{date(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
