import Link from "next/link";
import { ActionForm, Submit } from "@/components/forms";
import { signUp } from "@/app/actions/auth";

export const metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/" } = await searchParams;
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="h-display text-3xl">Join SurBazaar</h1>
      <p className="mt-2 text-sm text-muted">One account to buy licences. Producers apply to sell after signing up.</p>
      <ActionForm action={signUp} className="card mt-6 space-y-4 p-6">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password (8+ characters)</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </div>
        <p className="text-xs text-muted">
          By joining you accept our <Link href="/terms" className="link">terms and content rules</Link>.
        </p>
        <Submit className="btn-primary w-full">Create account</Submit>
      </ActionForm>
      <p className="mt-4 text-sm text-muted">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="link">Sign in</Link>
      </p>
    </div>
  );
}
