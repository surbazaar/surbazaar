import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/utils";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const { supabase } = await requireAdmin();
  const { data: s } = await supabase.rpc("admin_stats");
  const st = (s ?? {}) as Record<string, number>;
  const cards: [string, string | number, string?][] = [
    ["Producers waiting", st.producers_pending, "/admin/producers"],
    ["Beats to review", st.beats_pending, "/admin/beats"],
    ["Orders awaiting payment", st.orders_pending, "/admin/orders"],
    ["Payouts requested", money(st.payouts_requested), "/admin/payouts"],
    ["Open reports", st.reports_open, "/admin/reports"],
    ["Users", st.users],
    ["Approved producers", st.producers_approved],
    ["Live beats", st.beats_live],
    ["Paid orders (30 days)", st.orders_paid_30d],
    ["GMV (30 days)", money(st.gmv_30d)],
    ["Our commission (30 days)", money(st.platform_fee_30d)],
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([label, value, href]) => {
        const inner = (
          <>
            <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value ?? 0}</div>
          </>
        );
        return href ? (
          <Link key={label} href={href} className="card p-4 hover:border-saffron">{inner}</Link>
        ) : (
          <div key={label} className="card p-4">{inner}</div>
        );
      })}
    </div>
  );
}
