import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { signOut, updateAccount } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";
import { date, money, pkr } from "@/lib/utils";

export const metadata = { title: "My account" };

const ROLE_LABEL = { buyer: "Buyer", producer: "Producer", admin: "Admin" } as const;

export default async function AccountPage() {
  const { supabase, user, profile } = await requireUser("/account");

  const [{ data: orders }, { count: cartCount }, { data: producer }] = await Promise.all([
    supabase.from("orders").select("id, order_number, status, total_pkr, created_at, order_items(id)").eq("buyer_id", user.id).order("created_at", { ascending: false }),
    supabase.from("cart_items").select("*", { count: "exact", head: true }),
    supabase.from("producer_profiles").select("status, stage_name, slug, review_note").eq("user_id", user.id).maybeSingle(),
  ]);
  const { data: wallet } = producer?.status === "approved" ? await supabase.rpc("wallet_summary") : { data: null };

  const paid = (orders ?? []).filter((o) => o.status === "paid");
  const licences = paid.reduce((n, o) => n + o.order_items.length, 0);
  const pending = (orders ?? []).filter((o) => o.status === "pending_payment");
  const w = wallet?.[0];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Profile header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-saffron text-2xl font-bold text-ink">
          {(profile.display_name || profile.email || "?").charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="h-display truncate text-3xl">{profile.display_name || "My account"}</h1>
          <p className="text-sm text-muted">
            {profile.email} · <span className="text-saffron">{ROLE_LABEL[profile.role]}</span> · joined {date(user.created_at)}
          </p>
        </div>
      </div>

      {/* Pending payments first: the one thing that needs action */}
      {pending.length > 0 && (
        <div className="card space-y-3 border-saffron/50 p-5">
          <h2 className="font-semibold text-saffron">Payment pending</h2>
          {pending.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <span>
                <span className="font-mono">{o.order_number}</span> · {pkr(o.total_pkr)} · {date(o.created_at)}
              </span>
              <Link href={`/orders/${o.id}`} className="btn-primary">Pay now</Link>
            </div>
          ))}
        </div>
      )}

      {/* Quick summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile href="/orders" label="My licences" value={licences} hint="Beats you own a licence for" />
        <Tile href="/orders" label="Orders" value={orders?.length ?? 0} hint={pending.length ? `${pending.length} awaiting payment` : "All settled"} />
        <Tile href="/cart" label="Cart" value={cartCount ?? 0} hint="Items ready to check out" />
      </div>

      {/* Producer section */}
      <div className="card p-6">
        <h2 className="h-display text-2xl">Selling on SurBazaar</h2>
        {!producer ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">Make beats? Apply with a sample beat and keep 80% of every sale.</p>
            <Link href="/sell" className="btn-primary">Become a producer</Link>
          </div>
        ) : producer.status === "approved" ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-muted">
              Store: <Link href={`/p/${producer.slug}`} className="link">{producer.stage_name}</Link>
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Mini label="Available" value={money(w?.available_pkr)} />
              <Mini label="On 7-day hold" value={money(w?.on_hold_pkr)} />
              <Mini label="Lifetime earnings" value={money(w?.lifetime_pkr)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/studio" className="btn-primary">Open studio</Link>
              <Link href="/studio/upload" className="btn-ghost">Upload a beat</Link>
              <Link href="/studio/wallet" className="btn-ghost">Wallet & payouts</Link>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            <p className="flex items-center gap-2">Application: <StatusBadge status={producer.status} /></p>
            {producer.review_note && <p className="text-muted">Note from our team: {producer.review_note}</p>}
            <Link href="/sell" className="btn-ghost">{producer.status === "rejected" ? "Update & resubmit" : "View application"}</Link>
          </div>
        )}
      </div>

      {/* Recent orders */}
      {orders && orders.length > 0 && (
        <div>
          <div className="flex items-end justify-between">
            <h2 className="h-display text-2xl">Recent orders</h2>
            <Link href="/orders" className="link text-sm">See all</Link>
          </div>
          <div className="card mt-3 overflow-x-auto">
            <table className="data-table">
              <thead><tr><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/orders/${o.id}`} className="link font-mono">{o.order_number}</Link></td>
                    <td>{o.order_items.length}</td>
                    <td>{pkr(o.total_pkr)}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td className="text-muted">{date(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profile & security */}
      <div className="grid gap-6 md:grid-cols-2">
        <ActionForm action={updateAccount} className="card space-y-4 p-6">
          <h2 className="font-semibold">Profile & password</h2>
          <div>
            <label className="label" htmlFor="name">Display name</label>
            <input id="name" name="name" defaultValue={profile.display_name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" value={profile.email ?? ""} disabled className="input opacity-60" />
          </div>
          <div>
            <label className="label" htmlFor="password">New password (leave empty to keep)</label>
            <input id="password" name="password" type="password" minLength={8} className="input" autoComplete="new-password" />
          </div>
          <Submit>Save changes</Submit>
        </ActionForm>

        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Help</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/licences" className="link">What each licence allows</Link></li>
            <li><Link href="/verify" className="link">Verify a licence code</Link></li>
            <li><Link href="/terms" className="link">Terms & content rules</Link></li>
          </ul>
          <form action={signOut} className="border-t border-line pt-4">
            <button className="btn-danger">Sign out</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Tile({ href, label, value, hint }: { href: string; label: string; value: number; hint: string }) {
  return (
    <Link href={href} className="card p-5 transition hover:border-saffron">
      <div className="text-xs tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </Link>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2 p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}
