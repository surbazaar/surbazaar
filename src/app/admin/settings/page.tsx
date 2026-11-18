import { ActionForm, Submit } from "@/components/forms";
import { saveSettings } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Payment settings · Admin" };

export default async function AdminSettings() {
  const { supabase } = await requireAdmin();
  const { data: s } = await supabase.from("site_settings").select("*").single();
  const f: [string, string][] = [
    ["bank_name", "Bank name"], ["account_title", "Account title"], ["iban", "IBAN"], ["raast_id", "Raast ID"],
    ["jazzcash", "JazzCash number"], ["easypaisa", "Easypaisa number"],
  ];
  return (
    <ActionForm action={saveSettings} className="card max-w-2xl space-y-4 p-6">
      <h2 className="font-semibold">Where buyers send money</h2>
      <p className="text-sm text-muted">Shown on every unpaid order page. Leave a field empty to hide it. Use the business account.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {f.map(([k, l]) => (
          <div key={k}>
            <label className="label" htmlFor={k}>{l}</label>
            <input id={k} name={k} defaultValue={s?.[k] ?? ""} className="input" />
          </div>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="payment_note">Instructions</label>
        <textarea id="payment_note" name="payment_note" rows={2} defaultValue={s?.payment_note ?? ""} className="input" />
      </div>
      <Submit>Save</Submit>
    </ActionForm>
  );
}
