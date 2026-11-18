import { ActionForm, Submit } from "@/components/forms";
import { updateAccount } from "@/app/actions/auth";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { profile } = await requireUser("/account");
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="h-display text-3xl">Account</h1>
      <p className="mt-2 text-sm text-muted">{profile.email}</p>
      <ActionForm action={updateAccount} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Display name</label>
          <input id="name" name="name" defaultValue={profile.display_name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">New password (leave empty to keep)</label>
          <input id="password" name="password" type="password" minLength={8} className="input" autoComplete="new-password" />
        </div>
        <Submit>Save</Submit>
      </ActionForm>
    </div>
  );
}
