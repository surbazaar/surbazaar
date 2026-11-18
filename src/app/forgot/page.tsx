import { ActionForm, Submit } from "@/components/forms";
import { sendReset } from "@/app/actions/auth";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="h-display text-3xl">Reset password</h1>
      <ActionForm action={sendReset} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <Submit className="btn-primary w-full">Send reset link</Submit>
      </ActionForm>
    </div>
  );
}
