import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { StatusBadge } from "@/components/status";
import { applyProducer } from "@/app/actions/producer";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Sell your beats" };

export default async function SellPage() {
  const { supabase, user } = await requireUser("/sell");
  const [{ data: p }, { data: priv }] = await Promise.all([
    supabase.from("producer_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("producer_private").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (p?.status === "approved") {
    return (
      <div className="mx-auto max-w-xl space-y-4 text-center">
        <h1 className="h-display text-4xl">You&apos;re a SurBazaar producer</h1>
        <p className="text-muted">Upload beats, set prices and track sales in your studio.</p>
        <Link href="/studio" className="btn-primary">Open studio</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="h-display text-4xl">Sell your beats on SurBazaar</h1>
        <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
          <li>✓ Keep 80% of every sale (founding producers: 100% for 6 months)</li>
          <li>✓ Get paid in PKR to JazzCash, Easypaisa or bank</li>
          <li>✓ Automatic licence PDFs and secure file delivery</li>
          <li>✓ Free plan: up to 20 beats</li>
        </ul>
      </div>

      {p && (
        <div className="card flex flex-wrap items-center gap-3 p-4 text-sm">
          Application status: <StatusBadge status={p.status} />
          {p.review_note && <span className="text-muted">Note from our team: {p.review_note}</span>}
          {p.status === "pending" && <span className="text-muted">We&apos;ll review your samples soon. You can still edit below.</span>}
          {p.status === "rejected" && <span className="text-muted">Update your application and resubmit.</span>}
        </div>
      )}

      {p?.status !== "suspended" && (
        <ActionForm action={applyProducer} className="card space-y-5 p-6">
          <h2 className="font-semibold">Your producer profile (public)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="stage_name" label="Producer name" defaultValue={p?.stage_name} required />
            <Field name="slug" label="Store link: surbazaar…/p/" defaultValue={p?.slug} placeholder="your-name" />
            <Field name="city" label="City" defaultValue={p?.city} />
          </div>
          <div>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" rows={3} maxLength={1000} defaultValue={p?.bio ?? ""} className="input" />
          </div>
          <div className="space-y-2">
            <span className="label">3 sample beats for review (links)</span>
            {[0, 1, 2].map((i) => (
              <input key={i} name={`sample${i + 1}`} type="url" required defaultValue={p?.sample_links?.[i]} placeholder="https://soundcloud.com/…" className="input" />
            ))}
          </div>

          <h2 className="border-t border-line pt-5 font-semibold">Verification & payouts (private)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="legal_name" label="Full name (as on CNIC)" defaultValue={priv?.legal_name} required />
            <Field name="cnic" label="CNIC number" defaultValue={priv?.cnic} placeholder="42101-1234567-1" required />
            <Field name="phone" label="Mobile number" defaultValue={priv?.phone} placeholder="03xx-xxxxxxx" required />
            <div>
              <label className="label" htmlFor="payout_method">Payout method</label>
              <select id="payout_method" name="payout_method" defaultValue={priv?.payout_method ?? "jazzcash"} className="input">
                <option value="jazzcash">JazzCash</option>
                <option value="easypaisa">Easypaisa</option>
                <option value="bank">Bank account (IBAN)</option>
              </select>
            </div>
            <Field name="payout_account_title" label="Account title" defaultValue={priv?.payout_account_title} />
            <Field name="payout_account" label="Wallet number / IBAN" defaultValue={priv?.payout_account} />
          </div>
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" name="agree" required className="mt-1 accent-saffron" />
            <span>
              I accept the <Link href="/terms" className="link">producer agreement</Link>: everything I upload is my
              original work, all samples are cleared, and I&apos;m liable if that isn&apos;t true.
            </span>
          </label>
          <Submit>{p ? "Update application" : "Submit application"}</Submit>
        </ActionForm>
      )}
    </div>
  );
}

function Field({ name, label, ...rest }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} {...rest} defaultValue={rest.defaultValue ?? ""} className="input" />
    </div>
  );
}
